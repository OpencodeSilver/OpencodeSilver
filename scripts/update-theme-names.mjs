import fs from 'node:fs';

const files = [
  'packages/electron/resources/web-dist/assets/useAppFontEffects-DFc9Zmvo.js',
  'packages/electron/dist/win-unpacked/resources/web-dist/assets/useAppFontEffects-DFc9Zmvo.js',
  'packages/web/dist/assets/useAppFontEffects-DFc9Zmvo.js'
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log('Skipping missing:', file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  let before = content;

  content = content.replaceAll(
    'id:"opencodesilver-dark",name:"OpencodeSilver"',
    'id:"opencodesilver-dark",name:"OpencodeSilver"'
  );
  content = content.replaceAll(
    'id:"opencodesilver-light",name:"OpencodeSilver"',
    'id:"opencodesilver-light",name:"OpencodeSilver"'
  );
  content = content.replaceAll(
    'The OpencodeSilver signature',
    'The OpencodeSilver signature'
  );

  if (content !== before) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully updated theme names in:', file);
  } else {
    console.log('No matches found in:', file);
  }
}
