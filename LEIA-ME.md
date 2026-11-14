# 🪗 Arraiá das Baratas — jogo interativo para live do TikTok

Dois jogos em um, controlados pelo público da live:

- **Arraiá** – cada pessoa que comenta vira uma barata dançando forró. Curtidas enchem o *Forró Meter*; presentes disparam efeitos (chuva de baratinhas, barata gigante coroada, fogos, festa total).
- **Corrida** – inscrições pelo chat, contagem regressiva e corrida. Comentar, curtir e mandar presente acelera a sua barata. Ranking de vitórias.

## 1. Testar agora (sem live)

Dê dois cliques no `index.html`. Use o **painel à esquerda** para simular comentários, curtidas, presentes e seguidores. O botão "Demo automática" gera movimento sozinho. Teclas: `H` esconde o painel, `M` troca de modo.

## 2. Ligar na sua live de verdade

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
node server.js SEU_USUARIO_TIKTOK     # sem o @, com a live já ligada
```

Abra `http://localhost:3000`. O painel mostra "🟢 Conectado" quando pegou a live. Comentários, curtidas, presentes, follows e shares chegam sozinhos no jogo.

## 3. Colocar o jogo dentro da live

O jogo é vertical (1080x1920).

- **OBS (recomendado):** adicione uma *Fonte de Navegador* com a URL `http://localhost:3000/?panel=0&som=1`, largura 1080, altura 1920. Em seguida transmita pelo OBS ou capture a janela no TikTok LIVE Studio.
- **TikTok LIVE Studio:** adicione o navegador/janela com o jogo como captura de janela ou tela.
- Pelo celular você pode compartilhar a tela do PC, mas fica pior.

Os requisitos para transmitir do PC (seguidores, idade, etc.) mudam. Confira no app do TikTok.

URLs úteis: `?mode=corrida` abre direto na corrida · `?panel=0` esconde o painel · `?som=1` tenta ligar o som sozinho (no OBS costuma funcionar; no navegador comum, clique na tela uma vez).

## 4. Personalizar

No topo do script do `index.html` tem o bloco `CONFIG`:

- `faixas`: qual efeito cada faixa de diamantes dispara.
- `presentes`: efeito por nome do presente (ex.: `'rose': 'flores'`). Ações: `pulo`, `giro`, `flores`, `chuva`, `gigante`, `fogos`, `festa`.
- `likesBase` / `likesCrescimento`: dificuldade do Forró Meter.
- `bpm`, `maxBaratas`, `corridaVelocidade`, `corridaInscricao`, `bloqueadas` (palavras filtradas).

Comandos do chat no Arraiá: `!pular`, `!girar`, `!dancar`, `!cor azul` (marrom, vermelho, azul, verde, rosa, roxo, amarelo, preto, laranja, branco).

## Avisos importantes

- A conexão usa a biblioteca **tiktok-live-connector**, que **não é oficial**: ela lê os eventos públicos da live. O TikTok pode mudar algo e quebrar, e aí é preciso atualizar (`npm update`). Se der erro de assinatura/bloqueio, a biblioteca aceita uma chave de API de assinatura: `SIGN_API_KEY=sua_chave node server.js usuario`.
- O servidor só **lê** a live, não envia nada ao TikTok.
- Os nomes e comentários dos espectadores aparecem na tela. Mantenha a lista `bloqueadas` atualizada e fique de olho.
