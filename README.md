# Telenova Phone

**Telenova Phone** é um softphone web moderno e responsivo desenvolvido para realizar chamadas VoIP diretamente pelo navegador. Baseado no projeto ctxSip, o Telenova Phone oferece uma interface intuitiva e elegante, com suporte completo a WebRTC e WebSocket para comunicação em tempo real com servidores SIP como FreeSWITCH.

## Características

- **Interface Moderna**: Design clean e profissional com gradientes suaves e elementos visuais atraentes
- **Teclado Numérico Integrado**: Teclado numérico fixo na tela inicial para facilitar a discagem
- **Totalmente Responsivo**: Adapta-se automaticamente a diferentes tamanhos de tela (desktop, tablet, smartphone)
- **Suporte a WebRTC**: Chamadas de áudio e vídeo de alta qualidade
- **Conexão WebSocket**: Comunicação em tempo real com servidor SIP via WSS
- **Interface em Português**: Toda a interface traduzida para o português brasileiro
- **Funcionalidades Completas**: 
  - Realizar e receber chamadas
  - Controle de volume
  - Mudo (mute)
  - Retenção de chamada (hold)
  - Transferência de chamadas
  - Histórico de chamadas
  - Envio de DTMF durante chamadas

## Requisitos

- Navegador moderno com suporte a WebRTC (Chrome, Firefox, Safari, Edge)
- Servidor SIP compatível com WebSocket (FreeSWITCH, Asterisk, Kamailio, etc.)
- Certificado SSL válido para conexão WSS

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/rhallado/webphone.git
   cd webphone
   ```

2. Configure um servidor web para servir os arquivos (Apache, Nginx, ou qualquer servidor HTTP)

3. Acesse o arquivo `index.html` pelo navegador

## Configuração

Na primeira vez que acessar o Telenova Phone, você precisará configurar suas credenciais SIP:

1. Clique no ícone de configurações (engrenagem) no canto superior direito
2. Preencha os seguintes campos:
   - **Nome de Exibição**: Seu nome ou identificação
   - **Usuário SIP**: Seu número de ramal/extensão
   - **Senha**: Senha do ramal
   - **Domínio/Realm**: Domínio do servidor SIP
   - **Servidor WebSocket**: URL do servidor WebSocket (ex: `wss://sip.exemplo.com:7443`)
3. Clique em "Salvar e Recarregar"

As configurações serão salvas localmente no navegador.

## Uso

1. Digite o número de destino usando o teclado numérico ou o campo de entrada
2. Clique no botão verde de chamada para iniciar a ligação
3. Durante a chamada, você pode:
   - Ajustar o volume
   - Ativar/desativar o mudo
   - Colocar a chamada em espera
   - Transferir a chamada
   - Enviar tons DTMF usando o teclado
4. Clique no botão vermelho para encerrar a chamada

## Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Estilização e responsividade
- **JavaScript/jQuery**: Lógica da aplicação
- **SIP.js**: Biblioteca para comunicação SIP via WebRTC
- **WebRTC**: Protocolo para chamadas de áudio e vídeo
- **WebSocket**: Comunicação em tempo real com o servidor

## Compatibilidade

- ✅ Google Chrome (recomendado)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)
- ✅ Opera

## Versionamento

- **v1.0.0-stable**: Versão inicial com layout moderno
- **v1.1.0**: Interface traduzida para português e nome alterado para Telenova Phone
- **v1.2.0**: Adicionado teclado numérico na tela inicial
- **v1.3.0**: Interface refinada com responsividade completa

## Licença

Este projeto é baseado no [ctxSip](https://github.com/Collecttix/ctxSip) e mantém a mesma licença do projeto original.

## Suporte

Para questões, bugs ou sugestões, abra uma issue no repositório do GitHub.

---

**Desenvolvido com ❤️ para a Telenova**



## Teste de Conectividade SIP (v1.9.0)

Com base nas credenciais fornecidas pelo usuário (`Usuário: 1000`, `Senha: 321654987ab`, `Domínio/Realm: pabx01.telenova.com.br`, `Servidor WebSocket: wss://pabx01.telenova.com.br:7443`), foi realizado um teste de conectividade SIP. 

**Resultado:**

A conexão WebSocket com `wss://pabx01.telenova.com.br:7443/` **falhou**, e o objeto `ctxSip.ua` não foi inicializado, indicando que o webphone **não conseguiu se registrar** no servidor SIP com as credenciais fornecidas. As possíveis causas para esta falha incluem:

*   **Credenciais Inválidas**: As credenciais (usuário e/ou senha) podem estar incorretas ou não ativas no servidor SIP.
*   **Servidor SIP Inacessível**: O servidor `pabx01.telenova.com.br` pode não estar acessível da sandbox onde o teste foi executado, ou pode haver restrições de firewall.
*   **Configuração do Servidor WebSocket**: Pode haver uma configuração incorreta no servidor FreeSWITCH ou no proxy WebSocket que impede a conexão.

**Observação:** A funcionalidade de salvar as credenciais no `localStorage` e recarregar a página após o salvamento foi **confirmada como funcionando corretamente** na versão v1.9.0.

Para um teste de conectividade SIP bem-sucedido, seria necessário:

1.  Verificar a validade das credenciais no servidor SIP.
2.  Garantir que o servidor `pabx01.telenova.com.br` esteja acessível e configurado corretamente para conexões WebSocket seguras (WSS).
3.  Analisar os logs do servidor SIP para identificar a causa exata da falha de registro.


## Teste de Conectividade SIP (v2.0.1 - Após Desativação do Firewall)

Após a desativação do firewall do servidor, um novo teste de conectividade SIP foi realizado com as mesmas credenciais (`Usuário: 1000`, `Senha: 321654987ab`, `Domínio/Realm: pabx01.telenova.com.br`, `Servidor WebSocket: wss://pabx01.telenova.com.br:7443`).

**Resultado:**

O console do navegador ainda indica que o objeto `ctxSip` ou `ctxSip.ua` não está definido, e foi observado o erro `getUserMedia failed: NotFoundError: Requested device not found`. Isso sugere que a biblioteca SIP.js não está sendo inicializada corretamente ou não consegue acessar os dispositivos de mídia (microfone) no ambiente sandboxed do navegador.

**Conclusão:**

A desativação do firewall não resolveu o problema de conectividade SIP. A falha agora parece estar relacionada à inicialização da biblioteca SIP.js dentro do ambiente de execução do navegador, possivelmente devido a restrições de segurança para acesso a hardware (microfone) ou a um problema na configuração do `ctxSip` que impede a criação do User Agent (UA) SIP. Sem um `ctxSip.ua` válido, o registro SIP não pode ser estabelecido.

**Próximos Passos Sugeridos:**

1.  **Verificar Logs do Navegador (Detalhado):** Inspecionar o console do navegador para quaisquer outros erros ou avisos relacionados à inicialização do SIP.js ou WebRTC.
2.  **Testar em Ambiente Não-Sandboxed:** Tentar executar o webphone em um navegador local (fora da sandbox) para descartar restrições do ambiente de teste.
3.  **Revisar Configuração do SIP.js:** Assegurar que todas as dependências e configurações da biblioteca SIP.js estejam corretas e que o acesso ao microfone seja solicitado e concedido.

**Observação:** A funcionalidade de salvar as credenciais no `localStorage` e recarregar a página após o salvamento continua **funcionando corretamente**.
