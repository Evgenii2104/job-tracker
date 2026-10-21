import { Worker} from "bullmq";
import { db } from '../db.js';
import { connection} from "../queue.js";
import { writeFile, mkdir} from "node:fs/promises";
import { join } from 'node:path';

const EXPORTS_DIR = join(process.cwd(), 'var', 'exports');

const worker = new Worker('exports', async (job) => {
    const { exportId, userId } = job.data;

    await db.query(
        "UPDATE exports SET status = 'processing', progress = 0, updated_at = NOW() WHERE id = $1",
        [exportId],
    );

    const result = await db.query(
        `SELECT a.id, j.title, j.company, a.status, a.created_at
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC`,
        [userId],
    );

    await db.query(
        "UPDATE exports SET progress = 50, updated_at = NOW() WHERE id = $1",
        [exportId],
    );

    const escape = (v: unknown) => {
        let s = String(v ?? '');
        // Защита от formula injection
        if (/^[=+\-@\t\r]/.test(s)) {
            s = "'" + s;
        }
        return `"${s.replace(/"/g, '""')}"`;
    };
    const header = 'id,title,company,status,created_at\n';
    const rows = result.rows
        .map((r) => [r.id, r.title, r.company, r.status, new Date(r.created_at).toISOString()].map(escape).join(','))
        .join('\n');
    const csv = header + rows;

    await mkdir(EXPORTS_DIR, { recursive: true });
    const filePath = join('var', 'exports', `${exportId}.csv`);
    await writeFile(join(process.cwd(), filePath), csv, 'utf8');

    await db.query(
        "UPDATE exports SET status = 'completed', progress = 100, file_path = $1, updated_at = NOW() WHERE id = $2",
        [filePath, exportId],
    );

    return { filePath };
}, { connection });

worker.on('completed', (job) => console.log(`[export] completed ${job.id}`));
worker.on('failed', async (job, err) => {
    console.error(`[export] failed ${job?.id}:`, err);
    if (job?.data?.exportId) {
        await db.query("UPDATE exports SET status = 'failed' WHERE id = $1", [job.data.exportId]);
    }
});
