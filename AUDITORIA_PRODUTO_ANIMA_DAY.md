# Auditoria urgente — produto ANIMA/Anyma Day

**Data da auditoria:** 22/09/2026  
**Conta/perfil relacionado:** Greenn Bianca / IFTS  
**Produto histórico identificado:** `product_id 171399`

## Conclusão executiva

O produto `171399` existia e tinha vendas reais no histórico salvo localmente. No momento da verificação, ele não estava visível na conta Greenn da Bianca, nem na área de produtos desativados informada pelo responsável.

Não há evidência técnica suficiente para afirmar se o produto foi excluído, transferido para outra conta, ocultado por permissão, substituído por outro produto ou se a interface da Greenn deixou de listá-lo. A recuperação precisa ser feita pela Greenn ou pelo administrador da conta; o dashboard não consegue recriar nem restaurar um produto remoto.

## Evidências preservadas

O arquivo local `greenn_sales_complete.json` contém registros históricos do produto `171399`:

- 202 registros do produto;
- 171 com status pago;
- 11 aguardando pagamento;
- 13 recusados;
- 6 reembolsados;
- 1 criado;
- primeira data registrada: 05/05/2026;
- última venda paga registrada: 21/09/2026;
- ofertas observadas: `407610`, `407611`, `407612` e `456262`;
- total da conta no snapshot: 3.661 registros em 37 páginas;
- registros do produto no snapshot: 202.

O registro mais recente preservado é:

- venda `9983935`;
- produto `171399`;
- oferta `407610`;
- status `paid`;
- valor `R$ 97,00`;
- criado em `21/09/2026 14:32:32 UTC`;
- pago em `21/09/2026 14:33:35 UTC`.

## O que foi verificado no dashboard

- O perfil IFTS/Bianca aparece na API do Render.
- O perfil IFT retorna vendas.
- O histórico local confirma que o produto `171399` era real.
- A ausência atual do produto na interface Greenn impede confirmar vendas novas desse produto.
- O uso de `GREENN_BIANCA_PRODUCT_IDS=*` mistura produtos da conta e não pode ser usado para concluir que a meta do ANIMA Day foi atingida.

## Contenção imediata

Até a Greenn esclarecer o desaparecimento:

1. Não usar `*` para o perfil IFTS.
2. Manter `GREENN_BIANCA_PRODUCT_IDS=171399` no Render.
3. Não marcar vagas como preenchidas com base em dados agregados de outros produtos.
4. Não excluir nem sobrescrever `greenn_sales_complete.json`.
5. Preservar este relatório e os snapshots originais.

## Solicitação urgente à Greenn

Solicitar ao suporte:

> O produto Greenn `product_id 171399`, usado pelo perfil Bianca/IFTS para o evento ANIMA/Anyma Day, desapareceu da lista de produtos ativos e também não aparece em produtos desativados. Temos um snapshot de 202 registros, incluindo 171 pagos, com vendas até 21/09/2026. Solicito auditoria do histórico do produto, confirmação de eventual exclusão/transferência/arquivamento, restauração do produto ou indicação do novo `product_id`, preservando todas as vendas, ofertas e pagamentos. Favor informar data, usuário e ação responsável pela alteração.

Anexar ao chamado:

- identificação do produto: `171399`;
- ofertas: `407610`, `407611`, `407612`, `456262`;
- arquivo `greenn_sales_complete.json`;
- este relatório;
- capturas da tela da conta mostrando que o produto não aparece.

## Limitação

Este relatório registra e preserva as evidências disponíveis no projeto. Ele não prova, sozinho, quem removeu ou alterou o produto, porque o dashboard não possui acesso ao log administrativo interno da Greenn.
