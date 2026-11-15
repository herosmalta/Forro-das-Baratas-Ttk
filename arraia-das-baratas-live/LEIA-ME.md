# 🪗 Arraiá das Baratas v2 — jogo interativo para live do TikTok

Modos: **Arraiá** (festa junina com chat, curtidas e presentes) e **Corrida** (inscrição pelo chat, turbo com comentários, curtidas e presentes).

## O que mudou na v2

**Desempenho** (a prioridade)
- Partículas em *pool* fixo (arrays tipados), teto de 420 ao mesmo tempo (`maxParticulas`). Nunca cria milhares de elementos.
- Emojis, textos e baratas viram *sprites em cache*: são desenhados uma vez e reaproveitados.
- Fila de eventos: curtidas são somadas, comentários e presentes entram numa fila com ritmo controlado. Presentes iguais em rajada se fundem. Se a fila passar de 40, os efeitos são resumidos (o ranking continua contando tudo).
- Qualidade adaptativa: se o FPS cair, o jogo reduz sozinho partículas, sombras e brilhos e volta ao normal quando estabiliza.
- Servidor envia eventos em lotes de 100 ms, soma curtidas por pessoa e limita spam de chat.

**Personagens e presentes especiais**
- 🪗 **Sanfoneiro:** a barata do espectador se transforma (giro, fumaça, estrelas) e toca sanfona dançando forró. O nome continua aparecendo. Volta ao normal depois do tempo.
- 🤵 **Noivo** e 👰 **Noiva:** entram andando, em destaque. Com os dois presentes, começa a **cerimônia**: arco de flores, tapete, câmera cinematográfica, votos, beijo, corações, marcha nupcial (se o som estiver ligado), chuva de confete e fogos. Depois ficam "casados" soltando corações.

**Câmera cinematográfica**
- Cada presente faz a câmera ir até o personagem, com zoom suave, nome em destaque, raridade e animação do presente, e depois voltar ao panorama.
- Fila de câmera (máx. 5): presentes de menor raridade são descartados se encher; se a fila crescer, o foco fica mais curto.
- Raridade maior = câmera mais elaborada (inclinação, dolly, órbita, tremor, flash).

**Visual (2.5D)**: chão em perspectiva, baratas maiores quando mais perto, parallax entre céu e chão, sombras, brilho das fogueiras, vinheta.

**Interatividade**: 5 raridades de presente (Comum, Raro, Épico, Lendário, Mítico), nome colorido pelo total doado, medalhas 🥇🥈🥉, aura e coroa para o maior doador, combo (várias pessoas mandando presente juntas), metas de curtidas + mini-comemorações, onda no chat, entrada/saída animadas, novas danças (`!rebolar !sapatear !ola !estrela`).

## Rodando

Precisa do [Node.js](https://nodejs.org) 18+.

```bash
npm install
node server.js SEU_USUARIO_TIKTOK            # sem o @, com a live ligada
node server.js SEU_USUARIO_TIKTOK --presentes   # também lista os presentes (nome, id, valor)
```

Abra `http://localhost:3000`. Para a live (OBS, fonte de navegador 1080x1920): `http://localhost:3000/?panel=0&som=1`.
Sem live, dê dois cliques no `index.html` e use o painel de testes.

## ⚠️ Configure os presentes especiais

No bloco `CONFIG.especiais` do `index.html`, escolha **quais presentes da SUA live** invocam sanfoneiro, noivo e noiva. Os nomes que deixei (`sunglasses`, `hand hearts`, `perfume`, ...) são apenas exemplos: rode `node server.js usuario --presentes` e use nomes, ids ou valores reais. Dá para casar por `nomes`, `ids` ou `diamantes`.

## Testando os novos presentes (sem live)

No painel: **🪗 Sanfoneiro**, **🤵 Noivo**, **👰 Noiva**, **💒 Casar agora** (o nome vem do campo "usuário"). Para as raridades use os botões de 500, 1500 e 6000💎. **🌹 Chuva de 200 rosas** e **+60 bots** testam a carga. A linha "FPS" no painel mostra FPS, qualidade, partículas e filas. Atalhos: `H` painel, `M` modo, `C` câmera.

## Personalizar (tudo no `CONFIG`)
`faixas`, `presentes`, `especiais`, `raridades` (valores, cores, zoom e tempo de câmera), `emojis`, `camera`, `combo`, `metasCurtidas`, `likesMini`, `maxBaratas`, `maxParticulas`, `bloqueadas`, e as configurações da corrida.

## Sobre o 3D
Esta versão é **2.5D** (profundidade, perspectiva, parallax e iluminação em Canvas), sem dependências novas. O 3D com Three.js **não foi implementado**: veja a avaliação na resposta do Claude. A arquitetura já separa eventos/lógica do desenho, então um renderizador 3D pode ser trocado depois sem mexer no servidor nem nas mecânicas.

## Avisos
- A conexão usa a biblioteca **não oficial** tiktok-live-connector; se o TikTok mudar algo, atualize com `npm update`. Se pedir chave de assinatura: `SIGN_API_KEY=sua_chave node server.js usuario`.
- O servidor só **lê** a live. Nomes e comentários aparecem na tela: mantenha `bloqueadas` atualizada.
