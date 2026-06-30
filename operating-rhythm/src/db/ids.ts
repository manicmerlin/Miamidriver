import { nanoid } from 'nanoid/non-secure';

export const newId = () => nanoid(16);
export const now = () => Date.now();
