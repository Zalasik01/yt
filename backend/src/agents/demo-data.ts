// Respostas de exemplo para LLM_PROVIDER=demo: permitem ver a fábrica
// funcionando de ponta a ponta sem gastar com API.

export const demo_pauta = (topic: string | null) => ({
  topic: topic ?? 'O mistério do Passo Dyatlov',
  angle: 'Nove estudantes experientes, uma barraca rasgada por dentro e nenhuma explicação definitiva.',
  working_title: 'O que aconteceu no Passo Dyatlov?',
  key_points: ['A expedição', 'A barraca rasgada', 'Os corpos', 'As teorias', 'A explicação mais aceita'],
});

const DEMO_BLOCKS = [
  'Em fevereiro de 1959, nove estudantes experientes partiram para uma trilha nos montes Urais. Nenhum deles voltou.',
  'Semanas depois, as equipes de resgate encontraram a barraca. Ela tinha sido cortada de dentro para fora.',
  'Os corpos estavam espalhados pela encosta, alguns descalços, sob uma temperatura de trinta graus negativos.',
  'Por décadas surgiram teorias: avalanche, testes militares, até explicações sobrenaturais.',
  'Em 2021, um estudo com simulações apontou uma avalanche rara, de placa, como a causa mais provável.',
];

export const demo_roteiro = () => ({
  title: 'O Mistério do Passo Dyatlov: o que realmente aconteceu?',
  description:
    'Em 1959, nove estudantes desapareceram nos montes Urais. Neste vídeo, reconstruímos a história e as teorias.\n\nSe inscreva para mais mistérios.',
  tags: ['mistério', 'dyatlov', 'história', 'casos reais', 'documentário'],
  hook: 'Uma barraca cortada por dentro. Nove pessoas fugindo descalças na neve. O que poderia causar isso?',
  blocks: DEMO_BLOCKS.map((narration) => ({ narration, visual: 'snowy mountain pass at night, abandoned tent' })),
  outro: 'Algumas perguntas talvez nunca tenham resposta. Qual é a sua teoria? Conte nos comentários.',
});

export const demo_cenas = (positions: number[]) => ({
  scenes: positions.map((position) => ({
    position,
    image_prompt: 'snowy mountain pass at night, abandoned torn tent, cinematic',
    search_query: 'snowy mountains night',
  })),
});

export const demo_shorts = (positions: number[], count: number) => ({
  shorts: Array.from({ length: Math.min(count, Math.floor(positions.length / 2)) }, (_, index) => ({
    start_position: positions[index * 2]!,
    end_position: positions[index * 2 + 1]!,
    title: `O detalhe que ninguém explica #${index + 1} #shorts`,
    hook: 'Isso não faz sentido',
    description: 'Assista ao vídeo completo no canal.',
  })),
});

export const demo_thumbnail = () => ({
  text: 'Ninguém voltou',
  image_prompt: 'torn tent in the snow at night, dramatic lighting',
  search_query: 'tent snow night',
});
