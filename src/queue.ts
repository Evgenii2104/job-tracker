import { Queue} from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
});

export const exportsQueue = new Queue('exports', { connection });
export { connection}