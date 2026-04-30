// LoRA training pipeline.
//
// Three actions on this route, multiplexed by ?step=:
//
//   POST /api/train?step=presign
//     body: { userId, jobId, contentType }
//     returns: { uploadUrl, key } — client PUTs the selfies zip to uploadUrl.
//
//   POST /api/train?step=start
//     body: { userId, jobId, triggerWord, steps? }
//     returns: { trainingJobId } — fal.ai job id; resulting LoRA lands in
//             s3://<bucket>/loras/<userId>/<jobId>.safetensors when done.
//
//   POST /api/train?step=status
//     body: { trainingJobId }
//     returns: { status, loraUrl?, error? }
//
// Production flow as called from the client:
//   1. Client zips 20–30 selfies in browser (or uploads them one-by-one).
//   2. Client requests a presign, PUTs the zip to S3 directly.
//   3. Client tells the server to start training.
//   4. Server presigns the zip → calls falProvider.trainLora({ imagesZipUrl }).
//   5. Client polls status until COMPLETED, then downloads the .safetensors
//      and the server uploads it to s3://<bucket>/loras/<userId>/<jobId>.safetensors
//      (or — better — fal can be configured to push it there directly).

import { NextResponse } from "next/server";
import { trainLora } from "@/lib/ai/providers/fal";
import {
  presignPut,
  presignGet,
  trainingZipKey,
  loraKey,
  getS3,
  s3Bucket,
  publicUrl,
} from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const FAL_QUEUE = "https://queue.fal.run";

function falKey(): string {
  const k = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  if (!k) throw new Error("FAL_KEY missing");
  return k;
}

interface PresignBody {
  userId: string;
  jobId: string;
  contentType?: string;
}

interface StartBody {
  userId: string;
  jobId: string;
  triggerWord: string;
  steps?: number;
}

interface StatusBody {
  trainingJobId: string;
  userId: string;
  jobId: string;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const step = url.searchParams.get("step") ?? "start";

  try {
    if (step === "presign") {
      const body = (await req.json()) as PresignBody;
      if (!body.userId || !body.jobId) {
        return NextResponse.json({ ok: false, error: "userId + jobId required" }, { status: 400 });
      }
      const key = trainingZipKey(body.userId, body.jobId);
      const uploadUrl = await presignPut({
        key,
        contentType: body.contentType ?? "application/zip",
        expiresIn: 600,
      });
      return NextResponse.json({ ok: true, uploadUrl, key });
    }

    if (step === "start") {
      const body = (await req.json()) as StartBody;
      if (!body.userId || !body.jobId || !body.triggerWord) {
        return NextResponse.json(
          { ok: false, error: "userId + jobId + triggerWord required" },
          { status: 400 },
        );
      }

      // Mint a 30-minute presigned download URL for the zip and hand it to fal.
      // fal pulls the zip once at the start of training; 30 minutes is plenty.
      const zipKey = trainingZipKey(body.userId, body.jobId);
      const imagesZipUrl = await presignGet({ key: zipKey, expiresIn: 1800 });

      const queued = await trainLora({
        imagesZipUrl,
        triggerWord: body.triggerWord,
        steps: body.steps ?? 1000,
      });

      return NextResponse.json({
        ok: true,
        trainingJobId: queued.request_id,
        statusUrl: queued.status_url,
        responseUrl: queued.response_url,
      });
    }

    if (step === "status") {
      const body = (await req.json()) as StatusBody;
      if (!body.trainingJobId || !body.userId || !body.jobId) {
        return NextResponse.json(
          { ok: false, error: "trainingJobId + userId + jobId required" },
          { status: 400 },
        );
      }
      const statusRes = await fetch(
        `${FAL_QUEUE}/fal-ai/flux-lora-fast-training/requests/${body.trainingJobId}/status`,
        { headers: { Authorization: `Key ${falKey()}` } },
      );
      if (!statusRes.ok) {
        return NextResponse.json(
          { ok: false, error: `fal status ${statusRes.status}` },
          { status: 502 },
        );
      }
      const status = (await statusRes.json()) as {
        status: string;
        logs?: { message: string }[];
      };

      if (status.status === "COMPLETED") {
        // Pull the result, copy the .safetensors into our bucket, return its URL.
        const resp = await fetch(
          `${FAL_QUEUE}/fal-ai/flux-lora-fast-training/requests/${body.trainingJobId}`,
          { headers: { Authorization: `Key ${falKey()}` } },
        );
        if (!resp.ok) {
          return NextResponse.json(
            { ok: false, error: `fal response ${resp.status}` },
            { status: 502 },
          );
        }
        const j = (await resp.json()) as {
          diffusers_lora_file?: { url: string };
        };
        const remoteSafetensors = j.diffusers_lora_file?.url;
        if (!remoteSafetensors) {
          return NextResponse.json(
            { ok: false, error: "fal returned no .safetensors URL" },
            { status: 502 },
          );
        }

        // Mirror it into our bucket so subsequent generates use a stable key
        // we control (and so we're not at the mercy of fal's CDN expiry).
        const safetensors = await fetch(remoteSafetensors);
        if (!safetensors.ok) {
          return NextResponse.json(
            { ok: false, error: `mirror fetch ${safetensors.status}` },
            { status: 502 },
          );
        }
        const bytes = Buffer.from(await safetensors.arrayBuffer());
        const targetKey = loraKey(body.userId, body.jobId);
        await getS3().send(
          new PutObjectCommand({
            Bucket: s3Bucket(),
            Key: targetKey,
            Body: bytes,
            ContentType: "application/octet-stream",
            Metadata: {
              userid: body.userId,
              jobid: body.jobId,
              source: "fal-flux-lora-fast-training",
            },
          }),
        );

        return NextResponse.json({
          ok: true,
          status: "COMPLETED",
          loraUrl: publicUrl(targetKey),
          loraKey: targetKey,
        });
      }

      return NextResponse.json({
        ok: true,
        status: status.status,
        logs: status.logs?.map((l) => l.message) ?? [],
      });
    }

    return NextResponse.json({ ok: false, error: `unknown step: ${step}` }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
