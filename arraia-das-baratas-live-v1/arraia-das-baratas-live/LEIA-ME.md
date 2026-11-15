# 🪗 Arraiá das Baratas — jogo interativo para TikTok LIVE

Jogo vertical 2D com dois modos controlados pelo público:

- **Arraiá:** comentários criam baratas dançantes; comandos do chat mudam a dança e a cor; curtidas enchem o Forró Meter; presentes ativam efeitos; seguidores recebem destaque; compartilhamentos geram uma chuva de baratinhas.
- **Corrida:** comentários, curtidas, presentes, seguidores e compartilhamentos participam da corrida. O público pode entrar durante as inscrições; quem interagir depois do fechamento fica inscrito automaticamente na próxima rodada. Presentes dão turbo e compartilhamentos dão um pequeno impulso coletivo.

## 1. Requisitos

- Windows 10/11, macOS ou Linux.
- **Node.js 20 ou superior**.
- Internet para instalar as dependências e conectar ao TikTok.
- Uma live pública ativa no TikTok para testar os eventos reais.

A integração usa `tiktok-live-connector` 2.5.x, um projeto comunitário não oficial. Não é necessário fornecer senha, cookie ou token da conta para a conexão pública por nome de usuário. O TikTok pode alterar o protocolo a qualquer momento.

## 2. Instalação no Windows

1. Extraia a pasta `arraia-das-baratas-live`.
2. Dê dois cliques em **`INICIAR_LIVE.bat`**.
3. Na primeira execução, o arquivo instala as dependências automaticamente.
4. Digite seu usuário do TikTok quando for solicitado. Pode digitar com ou sem `@`.
5. Deixe a janela preta aberta enquanto estiver transmitindo.
6. Abra `http://localhost:3000` no navegador.

Para abrir apenas em modo de teste, pressione Enter quando o programa pedir o usuário. O servidor e o simulador funcionam sem conectar a uma live.

## 3. Instalação pelo terminal

Abra o terminal dentro da pasta do projeto:

```bash
npm install
npm start -- SEU_USUARIO_TIKTOK
```

Digite o usuário sem `@` (o servidor também remove `@` se você incluir). Para modo de teste sem TikTok:

```bash
npm start
```

No PowerShell do Windows, também pode usar `npm.cmd install` e `npm.cmd start -- SEU_USUARIO_TIKTOK` caso a política de execução bloqueie `npm.ps1`.

## 4. Colocar na live pelo OBS / TikTok LIVE Studio

O jogo usa proporção vertical 9:16, em 1080 × 1920.

**OBS:** adicione uma Fonte de Navegador com:

- URL: `http://localhost:3000/?panel=0&som=1`
- Largura: `1080`
- Altura: `1920`

Depois capture a saída do OBS no TikTok LIVE Studio ou faça a transmissão pelo próprio OBS.

**TikTok LIVE Studio:** adicione uma fonte de navegador, se disponível na sua versão, ou capture a janela do navegador com o jogo aberto. O painel de simulação pode ser ocultado com `H` ou com `?panel=0`.

URLs úteis:

- `http://localhost:3000/` — jogo com painel.
- `http://localhost:3000/?panel=0&som=1` — overlay para OBS.
- `http://localhost:3000/?mode=corrida` — abre direto na corrida.
- `http://localhost:3000/health` — diagnóstico da conexão e contagem de eventos.

## 5. Testar antes de entrar ao vivo

O painel lateral possui botões para simular comentários, curtidas, seguidores, compartilhamentos e presentes. Também há `+10 bots` e `Demo automática`.

Teste os dois modos:

**Arraiá**
- Comente `!pular`, `!girar`, `!dancar` ou `!cor azul`.
- Simule curtidas até encher o Forró Meter.
- Experimente Rose, Finger Heart, Doughnut, Lion e Universe.
- Teste seguir e compartilhar.

**Corrida**
- Troque para Corrida.
- Use nomes diferentes no campo de usuário e clique em Comentar para inscrever participantes.
- Teste curtidas, presentes, seguidores e compartilhamentos durante inscrições e durante a prova.
- Quem chegar depois do fechamento das inscrições fica na fila da próxima rodada.

## 6. Comandos do chat no Arraiá

- `!pular`
- `!girar`
- `!dancar`
- `!cor azul` — também aceita marrom, vermelho, verde, rosa, roxo, amarelo, preto, laranja e branco.

## 7. Eventos recebidos do TikTok

O servidor converte os payloads do conector para um formato único antes de enviá-los ao navegador por Server-Sent Events (SSE). Isso mantém o jogo independente das diferenças entre nomes de campos de versões antigas e atuais.

| Evento do TikTok | Efeito no Arraiá | Efeito na Corrida |
|---|---|---|
| Comentário | Cria/controla a barata e executa comandos | Inscreve ou acelera a barata inscrita |
| Curtida | Enche o Forró Meter | Inscreve durante o lobby ou dá turbo à sua corredora |
| Presente | Aciona efeitos conforme nome/diamantes | Inscreve ou concede turbo; presentes grandes afetam rivais |
| Seguidor | Coroa e destaca a barata | Inscreve ou concede turbo se já estiver na corrida |
| Compartilhamento | Gera baratinhas extras | Dá impulso coletivo aos corredores e registra para a próxima rodada se necessário |

Presentes em sequência são processados apenas no evento final da sequência, evitando contar o valor acumulado várias vezes.

## 8. Diagnóstico e problemas comuns

- **“Modo de teste”**: o servidor está aberto sem usuário TikTok. Reinicie e digite o usuário para conectar.
- **“Biblioteca ausente”**: execute `npm install` na pasta do projeto.
- **Erro de versão do Node.js**: atualize para Node.js 20 ou superior e reinstale as dependências.
- **Não conecta**: confirme que a live está ativa e pública, confira o nome do usuário e veja a mensagem no terminal. O servidor tenta reconectar automaticamente com intervalo progressivo.
- **O jogo abre, mas não recebe eventos**: abra `http://localhost:3000/health` e confira se `ok` está `true`. Se estiver conectado, faça um comentário/curtida de outra conta para testar.
- **Erro de assinatura/bloqueio do serviço de assinatura**: a biblioteca aceita uma chave opcional de assinatura. Configure `SIGN_API_KEY` como variável de ambiente antes de iniciar. Não coloque a chave no código nem compartilhe prints que a revelem.
- **Metadados de presentes**: por padrão, a consulta extra de catálogo fica desativada para evitar que uma falha nessa consulta impeça a conexão. Pode ser ativada com `ENABLE_EXTENDED_GIFT_INFO=true`.

O conector é não oficial e o próprio projeto informa que não é uma API de produção. Mesmo com os testes locais passando, a conexão e os eventos reais só podem ser confirmados com uma live ativa no TikTok.

## 9. Verificações de desenvolvimento

```bash
npm run check
npm test
```

Esses comandos verificam a sintaxe do servidor, do JavaScript embutido no HTML e executam testes unitários dos payloads de comentários, curtidas, presentes e eventos sociais.

## 10. Configuração visual

No início do JavaScript em `index.html`, edite o objeto `CONFIG` para ajustar cores, presentes, limites, velocidade, tempo de inscrição e quantidade máxima de participantes.
