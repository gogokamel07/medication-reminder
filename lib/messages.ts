export const DEFAULT_MESSAGES = [
  "Time for your dose. Small step, big difference. You've got this!",
  "Taking care of yourself is a win. Go take your medicine!",
  "You're doing great. Keep the streak going!",
  "Your future self says thank you. Take your dose now.",
  "One dose at a time. Proud of you for staying on track!",
  "Reminder time! Healthy habits are built exactly like this.",
  "Consistency beats perfection. Let's take that dose.",
  "You showed up yesterday, show up today. You can do it!",
];
export const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
