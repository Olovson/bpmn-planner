import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readdir, readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local or export it before running the script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

const bucketName = 'bpmn-files';
// VIKTIGT: Använd samma storage path struktur som upload funktionen
// Upload funktionen sparar i root: ${fileName}
// För konsistens, använd samma struktur här
const storagePrefix = ''; // Root level - samma som upload funktionen
const bpmnDir = resolve(__dirname, '../public/bpmn');

async function seedBpmnFiles() {
  const files = (await readdir(bpmnDir)).filter((file) => file.toLowerCase().endsWith('.bpmn'));

  if (files.length === 0) {
    console.warn('No BPMN files found in public/bpmn. Add files there first.');
    return;
  }

  for (const fileName of files) {
    const filePath = join(bpmnDir, fileName);
    const fileContents = await readFile(filePath);
    // VIKTIGT: Använd samma struktur som upload-bpmn-file funktionen
    // Upload funktionen använder: storagePath = ${fileName} (root level)
    const storagePath = storagePrefix ? `${storagePrefix}/${fileName}` : fileName;

    console.log(`Uploading ${fileName} to storage...`);
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, fileContents, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/xml',
    });

    if (uploadError) {
      console.error(`Failed to upload ${fileName}:`, uploadError.message);
      continue;
    }

    console.log(`Upserting metadata for ${fileName}...`);
    const { error: dbError } = await supabase.from('bpmn_files').upsert(
      {
        file_name: fileName,
        storage_path: storagePath,
        file_type: 'bpmn',
        size_bytes: fileContents.byteLength,
        github_synced: false,
        has_structure_changes: false,
        meta: null,
      },
      {
        onConflict: 'storage_path',
      }
    );

    if (dbError) {
      console.error(`Failed to save metadata for ${fileName}:`, dbError.message);
    } else {
      console.log(`Seeded ${fileName}`);
    }
  }
}

seedBpmnFiles()
  .then(() => {
    console.log('Seeding complete.');
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
