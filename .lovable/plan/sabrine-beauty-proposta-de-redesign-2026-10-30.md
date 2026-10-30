# Sabrine Beauty — proposta de redesign

## Conceito: beleza editorial, luxo sem excesso

A identidade passa de efeitos 3D e degradês para uma apresentação contemporânea, limpa e centrada nas fotografias reais da Sabrine, dos procedimentos e dos prêmios. Nenhuma funcionalidade será removida nesta mudança.

### Identidade visual

- **Branco porcelana — #FFFFFF:** fundo principal, com bastante espaço entre os conteúdos.
- **Preto café — #171412:** títulos, textos e botões principais; contraste forte e leitura confortável.
- **Marrom — #8B6955:** detalhes de identidade e superfícies secundárias, sem dominar a página.
- **Champagne — #C5A36B:** linhas finas e pequenos acabamentos; não será usado em textos de leitura sobre branco.
- **Tipografia proposta:** manter Playfair Display nos títulos e Inter nos textos e controles, com hierarquia refinada e sem excesso de letras maiúsculas.
- Botões discretos, contornos finos, ícones simples e cards de procedimentos consistentes, com cantos pouco arredondados.
- Retirar orbes, brilhos, flutuação decorativa, inclinação 3D e excesso de degradês. Usar apenas transições curtas, respeitando quem prefere menos movimento.
- Preservar o verde dos horários livres como indicação funcional, não como cor da identidade. Estados de erro continuam distinguíveis por texto e cor.

### Primeira tela e organização

**Sabrine Beauty** aparece como título principal, com uma fotografia real em destaque, sem moldura de card ou efeitos que escondam a imagem. Uma chamada breve acompanha o botão **Agendar horário**. A composição deixa o início do conteúdo seguinte visível, evitando o grande espaço vazio atual.

Ordem proposta para a página inicial:

1. Sabrine Beauty: fotografia, apresentação e acesso ao agendamento.
2. Seleção de procedimentos com os valores atuais.
3. Apresentação breve da Sabrine e seus reconhecimentos.
4. Seleção de resultados com fotografias grandes.
5. Agendamento completo no próprio site, sem login.
6. Aviso da agenda da próxima semana, abaixo dos horários, mantendo a liberação no domingo de manhã.
7. Assistente de IA já existente.
8. Destaque de serviços especiais e mentoria, com o contato atual.
9. Rodapé com Instagram, WhatsApp e informações existentes.

## Estrutura de navegação

| Item | Destino e conteúdo |
|---|---|
| Sabrine Beauty | Início `/` |
| A Sabrine | `/sobre`: história, fotografias e prêmios existentes |
| Procedimentos | `/procedimentos`: informações, valores e serviços especiais atuais |
| Resultados | `/resultados`: galeria das fotografias reais |
| Mentoria | `/mentoria`: informações existentes e consulta pelo contato atual; sem inscrições ou cursos fictícios |
| Agendar horário | Agendamento da página inicial `/#agendamento`, na mesma aba e sem login |

No celular, cabeçalho compacto com marca, botão de agendamento e menu acessível. A assistente permanece disponível na página inicial; WhatsApp e Instagram continuam acessíveis. O painel `/admin` mantém seu acesso separado da navegação pública.

As novas páginas complementam os resumos da página inicial; não eliminam conteúdo, acesso ao agendamento ou a assistente.

## Implementação por etapas

### 1. Fundação visual e página inicial
Aplicar paleta, tipografia, botões e nova composição editorial. Reaproveitar as fotos reais, sem substituí-las por imagens geradas. Preservar o funcionamento atual do agendamento, da assistente e dos contatos. Apresentar o resultado para revisão antes da próxima etapa.

### 2. Navegação e páginas de conteúdo
Criar as páginas propostas com o conteúdo já existente, sem inventar credenciais, depoimentos, resultados, preços ou promessas. Adaptar menus, galerias e leitura para celular. Manter os botões de agendamento na mesma aba e com a seleção do procedimento preservada.

### 3. Agendamento, assistente e painel
Aplicar a identidade visual aos controles existentes e ao painel, sem mudar regras ou integrações. Conferir disponibilidade, seleção do horário, dados da cliente, Pix, envio ao WhatsApp e confirmação manual. Verificar também que a página não rola sozinha no celular.

### 4. Validação e preparação para publicação
Conferir celular e computador, contraste, navegação por teclado, fotos, títulos de páginas e ausência de sobreposições. Validar o fluxo completo com um pedido controlado e remover o pedido de teste. Revisar o painel com acesso autorizado. Publicar somente quando solicitado, após a aprovação visual.

## O que permanece protegido

- Valores, sinais, serviços e informações comerciais atuais.
- Horários cadastrados e regras de disponibilidade; nenhuma vaga será adicionada ou removida pelo redesign.
- Agendamento sem login, chave Pix, envio de comprovante ao WhatsApp e aprovação manual em até oito horas.
- Pedido não bloqueia o horário sozinho; regras atuais de remarcação, tolerância e prioridade do comprovante.
- Dados, integrações e painel administrativo existentes.

## Preparação para evolução futura

A organização será preparada para acrescentar loja de produtos próprios, carrinho, checkout, acompanhamento de pedidos, área de clientes, fidelidade e cursos quando cada etapa for autorizada. Agendamento e IA já existentes serão preservados.

**Não serão criados agora:** produtos fictícios, carrinho sem compra real, pagamentos novos, cadastro obrigatório, pontos de fidelidade ou cursos sem conteúdo. Esses itens não aparecem como disponíveis no menu.

### Estrutura técnica

- Manter TanStack Start, os dados e as integrações atuais.
- Centralizar a identidade em tokens semânticos e componentes de interface compartilhados.
- Separar apresentação e regras de negócio: o redesign não altera funções de agendamento, pagamentos ou permissões.
- Criar páginas reais para os destinos da navegação, com metadados próprios; preservar URLs existentes e `#agendamento`.
- Compartilhar cabeçalho e rodapé apenas entre páginas públicas, mantendo a experiência administrativa separada.
- Organizar módulos para extensões futuras sem adicionar tabelas, serviços de pagamento ou integrações antes de autorização.

## Aprovação solicitada

Aprovar esta direção visual e estrutura de navegação para iniciar a **etapa 1**, sem publicar nem alterar a agenda.