const xlsx = require('xlsx');
const wb = xlsx.readFile('c:/Users/Daniel/Desktop/Lider-em-Acao/08 - Plano de ocup. Ago26 (1).xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log(data[0]); // Headers
console.log(data[1]); // First row
