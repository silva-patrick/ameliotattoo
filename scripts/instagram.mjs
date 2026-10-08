// Busca os posts mais recentes do Instagram e grava no site publicado.
// Roda no GitHub Actions (ver .github/workflows/deploy.yml). Uso: node scripts/instagram.mjs <pasta-do-site>
//
// Variáveis de ambiente:
//   INSTAGRAM_TOKEN  token de longa duração da API do Instagram (secret do repositório)
//   GH_ADMIN_TOKEN   opcional: token do GitHub com permissão de "Secrets" para salvar o token renovado
//
// Qualquer falha aqui apenas mantém a seção do Instagram vazia; o site continua sendo publicado.

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2] ?? '_site';
const MAX_POSTS = 8;
const API = 'https://graph.instagram.com';

let token = process.env.INSTAGRAM_TOKEN?.trim();

async function getJSON(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body;
}

// Tokens do Instagram expiram em 60 dias; renovar a cada publicação mantém o token vivo.
async function refreshToken() {
  try {
    const data = await getJSON(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
    const days = Math.round(data.expires_in / 86400);
    console.log(`Token renovado (válido por ~${days} dias).`);
    if (data.access_token && data.access_token !== token) {
      console.log(`::add-mask::${data.access_token}`);
      token = data.access_token;
      saveSecret(token);
    }
  } catch (err) {
    console.log(`::warning::Não foi possível renovar o token do Instagram: ${err.message}`);
  }
}

function saveSecret(value) {
  if (!process.env.GH_ADMIN_TOKEN || !process.env.GITHUB_REPOSITORY) {
    console.log('::warning::O token do Instagram mudou, mas GH_ADMIN_TOKEN não está configurado para salvá-lo.');
    return;
  }
  execFileSync('gh', ['secret', 'set', 'INSTAGRAM_TOKEN', '--repo', process.env.GITHUB_REPOSITORY], {
    input: value,
    env: { ...process.env, GH_TOKEN: process.env.GH_ADMIN_TOKEN },
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  console.log('Novo token salvo no secret INSTAGRAM_TOKEN.');
}

async function main() {
  if (!token) {
    console.log('INSTAGRAM_TOKEN não configurado; seção do Instagram ficará com o convite para seguir.');
    return;
  }

  await refreshToken();

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const { data = [] } = await getJSON(`${API}/me/media?fields=${fields}&limit=${MAX_POSTS + 4}&access_token=${token}`);

  // As URLs de imagem do Instagram expiram, então baixamos as imagens para o site.
  const dir = join(OUT, 'images', 'instagram');
  await mkdir(dir, { recursive: true });

  const posts = [];
  for (const item of data) {
    if (posts.length >= MAX_POSTS) break;
    const src = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
    if (!src) continue;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(join(dir, `${item.id}.jpg`), Buffer.from(await res.arrayBuffer()));
      posts.push({
        imagem: `/images/instagram/${item.id}.jpg`,
        link: item.permalink,
        legenda: (item.caption ?? '').slice(0, 300),
        data: item.timestamp,
      });
    } catch (err) {
      console.log(`::warning::Falha ao baixar imagem do post ${item.id}: ${err.message}`);
    }
  }

  const file = join(OUT, 'content', 'instagram.json');
  await writeFile(file, JSON.stringify({ atualizado: new Date().toISOString(), posts }, null, 2));
  console.log(`${posts.length} posts do Instagram salvos em ${file}.`);
}

main().catch((err) => {
  console.log(`::warning::Instagram não atualizado: ${err.message}`);
});
