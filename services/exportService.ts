
import { Profile, TransactionType } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToJson = (profile: Profile) => {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Export_${profile.name}_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToCsv = (profile: Profile) => {
  let csv = "Datum,Beschreibung,Betrag,Typ\n";
  profile.entries.forEach(e => {
    csv += `"${e.date}","${e.description}",${e.amount},"${e.type}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Export_${profile.name}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPdf = (profile: Profile) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text(`Finanzbericht: ${profile.name}`, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Verantwortlich: ${profile.responsible || 'N/A'}`, 14, 30);
  doc.text(`Steuernummer: ${profile.taxId || 'N/A'}`, 14, 35);
  doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 14, 40);

  // Calculations
  let inc = 0, exp = 0;
  profile.entries.forEach(e => {
    if (e.type === TransactionType.INCOME) inc += e.amount;
    else exp += e.amount;
  });
  const tax = Math.max(0, (inc - exp) * (profile.taxRate / 100));
  const net = inc - exp - tax;

  doc.text(`Zusammenfassung:`, 14, 50);
  doc.text(`Einnahmen: $${inc.toFixed(2)}`, 14, 55);
  doc.text(`Ausgaben: $${exp.toFixed(2)}`, 14, 60);
  doc.text(`Steuer (${profile.taxRate}%): $${tax.toFixed(2)}`, 14, 65);
  doc.setFont(undefined, 'bold');
  doc.text(`Gewinn: $${net.toFixed(2)}`, 14, 70);
  doc.setFont(undefined, 'normal');

  const tableData = profile.entries.map(e => [
    e.date,
    e.description,
    e.type === TransactionType.INCOME ? `+$${e.amount.toFixed(2)}` : `-$${e.amount.toFixed(2)}`,
    e.type
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Datum', 'Info', 'Betrag', 'Typ']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }
  });

  doc.save(`Finanzbericht_${profile.name}.pdf`);
};
