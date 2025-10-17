# Correção de Bug - Botão "Salvar e Recarregar"

## Problema Identificado

O botão "Salvar e Recarregar" no modal de configurações não estava funcionando devido a um arquivo faltante.

## Causa Raiz

O arquivo `index.html` na linha 247 referenciava o arquivo `scripts/config.js`, mas este arquivo não existia no repositório. Isso causava um erro de carregamento (`ERR_FILE_NOT_FOUND`) que impedia o funcionamento correto da aplicação.

## Solução Implementada

1. **Criado o arquivo `scripts/config.js`** - Este arquivo agora carrega as credenciais SIP do localStorage e define a variável `user` necessária para a inicialização do aplicativo.

2. **Lógica implementada**:
   - O arquivo verifica se existem credenciais salvas no localStorage
   - Se não existir, a variável `user` fica como `null`
   - O código em `app-modern.js` detecta isso e exibe o modal de configuração

## Arquivos Modificados

- **NOVO**: `scripts/config.js` - Arquivo de configuração criado para gerenciar credenciais do localStorage

## Teste

Após a correção, o botão "Salvar e Recarregar" funciona corretamente:
1. Preenche os campos de configuração
2. Clica no botão "Salvar e Recarregar"
3. As credenciais são salvas no localStorage
4. A página é recarregada automaticamente
5. O softphone se conecta com as credenciais fornecidas

## Data da Correção

17 de outubro de 2025

