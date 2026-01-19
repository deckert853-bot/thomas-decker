
import { Profile, TransactionType } from '../types';

export const sendToDiscord = async (profile: Profile, webhooks: string[]) => {
  const mf = profile.monthFilter;
  const filtered = profile.entries
    .filter(e => !mf || e.date.startsWith(mf))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  let inc = 0, exp = 0;
  profile.entries.filter(e => !mf || e.date.startsWith(mf)).forEach(e => {
    if (e.type === TransactionType.INCOME) inc += e.amount;
    else exp += e.amount;
  });

  const tax = Math.max(0, (inc - exp) * (profile.taxRate / 100));
  const net = inc - exp - tax;

  const lines = filtered.map(e => 
    `📅 ${e.date} **${e.description}**: ${e.type === TransactionType.INCOME ? '+' : '-'}$${e.amount.toFixed(2)}`
  ).join("\n");

  const payload = {
    embeds: [{
      title: `📊 Finanzbericht: ${profile.name}`,
      color: net >= 0 ? 3066993 : 15158332,
      fields: [
        { name: "Verantwortlich", value: profile.responsible || "Nicht angegeben", inline: true },
        { name: "Steuernummer", value: profile.taxId || "N/A", inline: true },
        { name: "Monat", value: mf || "Gesamtzeitraum", inline: true },
        { name: "Zusammenfassung", value: `>>> Einnahmen: **$${inc.toFixed(2)}**\nAusgaben: **$${exp.toFixed(2)}**\nSteuer (${profile.taxRate}%): **$${tax.toFixed(2)}**\n**Gewinn: $${net.toFixed(2)}**` },
        { name: "Letzte Einträge", value: lines || "_Keine Einträge vorhanden_" }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  const results = await Promise.all(webhooks.map(async (url) => {
    if (!url || !url.startsWith("http")) return false;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (e) {
      console.error("Discord send error:", e);
      return false;
    }
  }));

  return results.some(r => r === true);
};
