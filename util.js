export function random(min, max) {
  return Math.random() * (max - min) + min;
}

export function mention(id) {
  return `<@!${id ?? process.env.CLIENT_ID ?? 'fake-bot-id'}>`;
}

export default {};
