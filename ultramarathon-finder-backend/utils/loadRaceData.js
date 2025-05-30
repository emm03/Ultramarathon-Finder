import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function loadRaceData() {
    const filePath = path.join(__dirname, '..', 'data', 'duv_ultramarathons.csv');

    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                results.push({
                    name: data['Race Name'],
                    date: data['Date'],
                    location: data['Location'],
                    distance: data['Distance'],
                    website: data['Website'],
                });
            })
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}
