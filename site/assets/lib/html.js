const LEARNER_TEXT = Object.freeze({
  'Underground excavation water-failure mechanisms': '地下開挖地下水破壞機制',
  'Explain, without relying on formula drills, how excavation changes groundwater conditions and why water begins moving toward or into the excavation.': '說明開挖如何改變地下水條件，以及地下水為什麼會開始朝開挖區流動或流入開挖區。',
  'Explain piping (Piping) as a progressive internal-erosion mechanism from seepage concentration through particle loss, backward erosion, seepage-channel formation, and ground loss.': '說明管湧（Piping）的漸進破壞機制：滲流集中後帶走土粒，逐步向後侵蝕，形成滲流通道並造成地盤流失。',
  'Explain boiling/sand boiling (Boiling) from upward seepage through permeable soil to loss of soil stability, bubbling, and sand eruption.': '說明砂湧（Boiling）：地下水向上滲流通過透水土層，使土體失去穩定，出現冒泡並噴砂。',
  'Distinguish piping, boiling, basal heave, and uplift from soil type, driving force, failure location, soil movement, and field symptoms.': '從土質、驅動力、破壞位置、土體移動方式與現場徵兆，區分管湧、砂湧、隆起與上浮。',
  'Reconstruct how a small seepage abnormality can escalate into ground loss, excavation instability, adjacent settlement, or structural damage.': '說明小規模滲流異常如何逐步惡化成地盤流失、開挖失穩、鄰地沉陷或結構損壞。',
  'Derive emergency and preventive measures from the failure mechanism, including reducing head difference, sealing seepage paths, adding resisting weight, groundwater control, ground improvement, stoppage, and monitoring.': '從破壞機制推導緊急與預防措施，包括降低水頭差、封堵滲流路徑、增加抗力、地下水控制、地盤改良、停工與監測。',
  'Final integration / verification: Integrate the mechanisms into Level A past-exam answers using relevant piping, boiling, basal-heave, and emergency-response questions, including `Q-0337` from `CACHE-0001`.': '最後整合與驗證：把管湧、砂湧、隆起與緊急應變機制整合到甲級考古題作答。',
  'Two-week intensive sprint on construction-management Level A past exams and Anki capture.': '兩週集中複習營造工程管理甲級考古題，並同步整理 Anki。',
  'Continue 110-year past exams from morning A-2, `營造業工地主任應負責辦理工作`.': '繼續 110 年考古題，從上午 A-2「營造業工地主任應負責辦理工作」開始。',
  'finish 110 A/B/C/D, then 109 and 108.': '完成 110 年 A／B／C／D 題組，再依序進行 109 年、108 年。',
  'Objective 02 piping remains verified.': '管湧（Piping）機制已能正確說明。',
  'Sand boiling mechanism has been reconstructed with prompting but Objective 03 is not yet verified unaided.': '砂湧（Boiling）在提示下可以重建機制，但尚未確認能無提示完整說明。',
  'Hydraulic-gradient terminology remains less stable.': '水力梯度相關術語仍不夠熟。',
  'Track complete': '本主題已完成',
  'Course track': '學習主題',
});

export function learnerText(value) {
  const text = String(value ?? '');
  if (LEARNER_TEXT[text]) return LEARNER_TEXT[text];
  const prefix = 'Underground excavation water-failure mechanisms | ';
  if (text.startsWith(prefix)) {
    const rest = text.slice(prefix.length);
    return `地下開挖地下水破壞機制｜${LEARNER_TEXT[rest] || rest}`;
  }
  return text;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

export function formatDate(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(value);
}

export function splitScopeTags(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const parts = text.split(/\s+(?:and|&)\s+|[、;；／/]+/i).map((item) => item.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, 4) : [text];
}
