import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

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
            .on('end', () => {
                resolve(results);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}
