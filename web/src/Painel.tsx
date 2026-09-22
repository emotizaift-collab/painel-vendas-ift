import React from 'react';
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Metrics, MetricsResponse } from '../../shared/types';
import { dinheiro, numero, diaCurto, dataBr } from './format';

interface Props {
  dados: MetricsResponse;
}

/**
 * Cores do gráfico.
 *
 * O cobre fica só na série principal (Vendas) — é o resultado que o painel
 * existe para acompanhar. Leads é contexto e vai em cinza neutro.
 *
 * O cinza e escuro de proposito: Leads tem valores muito maiores que Vendas,
 * entao um cinza claro roubava o olhar justamente da serie que importa. Par
 * validado contra o fundo da pagina: ΔE 17,4 em visao normal, 14,3 em
 * protanopia, e contraste acima de 3:1 — passa em todas as checagens.
 */
const COR_PRINCIPAL = '#c08a4e';
const COR_SECUNDARIA = '#6e6a63';
const COR_EIXO = '#8f8a80';
const COR_GRADE = '#2a2621';
const CORES_INGRESSOS = ['#49b7a5', '#c08a4e', '#78a6d8', '#d87991', '#9eb0c8'];

export function Painel({ dados }: Props) {
  const m = dados.metrics;
  const agrupado = m.serie.some((ponto) => ponto.date !== ponto.dateFim);
  const serie = m.serie.map((ponto) => ({
    ...ponto,
    rotulo:
      ponto.date === ponto.dateFim
        ? diaCurto(ponto.date)
        : `${diaCurto(ponto.date)}-${diaCurto(ponto.dateFim)}`,
  }));
  const distribuicaoIngressos = m.greennOffers
    .filter((offer) => offer.sales > 0)
    .map((offer) => ({
      name: offer.ticketType,
      value: offer.sales,
      receita: offer.revenue,
    }));

  const lucro = m.retorno >= 0;
  const cacGreenn = m.officialSales > 0 ? m.custoCampanha / m.officialSales : null;
  const roasGreenn = m.custoCampanha > 0 ? m.officialRevenue / m.custoCampanha : null;

  return (
    <>
      <section className="heroi">
        <div className="heroi-principal">
          <div className="heroi-rotulo">Resultado do período</div>
          <div className="heroi-valor num">{dinheiro(m.retorno)}</div>
          <div className="heroi-nota">
            <span className={`heroi-sinal ${lucro ? 'positivo' : 'negativo'}`}>
              {lucro ? 'Lucro' : 'Prejuízo'}
            </span>
            {' · '}
            Faturamento líquido menos o custo de campanha.
          </div>
        </div>
        <div className="heroi-resumo">
          <div className="heroi-resumo-label">Desempenho comercial</div>
          <div className="heroi-resumo-linha">
            <span>Conversão em vendas</span>
            <strong>{m.leadsTotal > 0 ? `${((m.officialSales / m.leadsTotal) * 100).toFixed(1)}%` : '—'}</strong>
          </div>
          <div className="heroi-resumo-linha">
            <span>Ticket médio</span>
            <strong>{m.officialSales > 0 ? dinheiro(m.officialRevenue / m.officialSales) : '—'}</strong>
          </div>
          <div className="heroi-resumo-linha">
            <span>Status financeiro</span>
            <strong className={lucro ? 'positivo' : 'negativo'}>{lucro ? 'Positivo' : 'Atenção'}</strong>
          </div>
        </div>
      </section>

      {m.contagemRegressiva && <Contagem c={m.contagemRegressiva} />}

      <section className="metricas">
        <Metrica
          rotulo="Pedidos totais (Greenn)"
          valor={numero(m.officialOrders)}
          nota="Todas as ofertas do produto, incluindo pendentes"
        />
        <Metrica rotulo="Vendas oficiais (Greenn)" valor={numero(m.officialSales)} />
        <Metrica rotulo="Receita oficial (Greenn)" valor={dinheiro(m.officialRevenue)} />
        <Metrica rotulo="Aguardando pagamento" valor={numero(m.officialPending)} />
        <Metrica rotulo="Reembolsadas" valor={numero(m.officialRefunded)} />
        <Metrica
          rotulo="Participantes oficiais (Greenn)"
          valor={numero(m.officialParticipants)}
          nota="Quantidade informada nas vendas pagas"
        />
        <Metrica
          rotulo="Custo de campanha"
          valor={dinheiro(m.custoCampanha)}
          nota={
            m.fonteCompartilhada && m.fonteCompartilhada.custo > 0
              ? `Inclui ${dinheiro(m.fonteCompartilhada.custo)} do período, não separado por edição`
              : undefined
          }
        />
        <Metrica rotulo="Leads" valor={m.leadsSemFonte ? '—' : numero(m.leadsTotal)} nota={notaDosLeads(m)} />
        <Metrica rotulo="Participantes totais" valor={numero(m.participantes)} nota="Greenn + convidados + embaixadores" />
        <Metrica
          rotulo="Custo por lead"
          valor={m.custoPorLead === null ? '—' : dinheiro(m.custoPorLead)}
          nota={
            m.custoPorLead === null
              ? m.leadsSemFonte
                ? 'Não há como calcular sem leads próprios'
                : 'Sem leads no período'
              : undefined
          }
        />
        <Metrica
          rotulo="CAC real (Greenn)"
          valor={cacGreenn === null ? '—' : dinheiro(cacGreenn)}
          nota="Gasto Meta ÷ vendas pagas na Greenn"
        />
        <Metrica
          rotulo="ROAS real (Greenn)"
          valor={roasGreenn === null ? '—' : `${roasGreenn.toFixed(2)}x`}
          nota="Receita Greenn ÷ gasto Meta"
        />
      </section>

      {m.greennProfiles.length > 0 && (
        <section className="secao">
          <h2 className="secao-titulo">Vendas reais por perfil Greenn</h2>
          <p className="secao-sub">
            Cada perfil é lido separadamente. Os produtos e valores não são misturados.
          </p>
          <div className="linhas">
            {m.greennProfiles.map((profile) => (
              <Item
                key={profile.id}
                n={profile.sales}
                t={profile.label}
                sub={`${dinheiro(profile.revenue)} · ${profile.pending} aguardando · ${profile.refunded} reembolsada(s)`}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grade-detalhe">
        <section className="secao">
          <h2 className="secao-titulo">Ingressos oficiais da Greenn</h2>
          <p className="secao-sub">
            Vendas e receita agrupadas exclusivamente pelas ofertas da Greenn. A categoria Individual, Duplo,
            Triplo ou VIP é uma classificação técnica das ofertas encontradas; a planilha não é usada para
            contar ingressos pagos, vendas ou faturamento.
          </p>
          <div className="linhas">
            {m.greennOffers.map((offer) => (
              <div className="ingresso-linha" key={offer.offerId}>
                <div className="ingresso-topo">
                  <div>
                    <strong>{offer.ticketType}</strong>
                    <span>Oferta {offer.offerId}</span>
                  </div>
                  <strong className="num">{numero(offer.sales)}</strong>
                </div>
                <div className="ingresso-barra">
                  <span style={{ width: `${m.officialSales > 0 ? Math.min(100, (offer.sales / m.officialSales) * 100) : 0}%` }} />
                </div>
                <div className="ingresso-rodape">
                  <span>{offer.orders} pedidos · {offer.pending} pendente(s)</span>
                  <strong>{dinheiro(offer.revenue)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="secao">
          <h2 className="secao-titulo">Embaixadores</h2>
          <p className="secao-sub">
            Convite de embaixador é entrada gratuita: cada convidado conta como 1 pessoa nos Participantes,
            mas não entra no faturamento.
          </p>
          <div className="linhas">
            <Item n={m.embaixador.embaixadores} t="Embaixadores" />
            <Item n={m.embaixador.convidados} t="Convidados" sub="cada um = 1 pessoa" />
            <Item n={m.embaixador.total} t="Total" />
          </div>
          {notaDosConvites(m) && <p className="secao-nota">{notaDosConvites(m)}</p>}
        </section>
      </div>

      <section className="graficos-grade">
        <div className="grafico grafico-principal">
          <h3>Leads e vendas {agrupado ? 'a cada 3 dias' : 'por dia'}</h3>
          <p className="grafico-sub">
            {agrupado
              ? 'O período tem mais de 31 dias, então cada ponto soma 3 dias.'
              : 'Um ponto por dia do período selecionado.'}
          </p>
          <ResponsiveContainer width="100%" height={330}>
            <LineChart data={serie} margin={{ top: 4, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid stroke={COR_GRADE} vertical={false} />
            <XAxis
              dataKey="rotulo"
              stroke={COR_EIXO}
              tick={{ fill: COR_EIXO, fontSize: serie.length > 20 ? 10 : 12 }}
              tickLine={false}
              axisLine={{ stroke: COR_GRADE }}
              tickMargin={8}
              interval={serie.length <= 31 ? 0 : 'preserveStartEnd'}
              minTickGap={serie.length <= 31 ? 0 : 28}
              angle={serie.length > 12 ? -45 : 0}
              textAnchor={serie.length > 12 ? 'end' : 'middle'}
              height={serie.length > 12 ? 68 : 30}
            />
            <YAxis
              stroke={COR_EIXO}
              tick={{ fill: COR_EIXO, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: '#3a352e', strokeWidth: 1 }}
              contentStyle={{
                background: '#221e1a',
                border: '1px solid #3a352e',
                borderRadius: 3,
                color: '#edeae4',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              labelStyle={{ color: '#8f8a80', marginBottom: 4 }}
              labelFormatter={(rotulo: string) => {
                const ponto = serie.find((item) => item.rotulo === rotulo);
                if (!ponto) return rotulo;
                return ponto.date === ponto.dateFim
                  ? dataBr(ponto.date)
                  : `${dataBr(ponto.date)} a ${dataBr(ponto.dateFim)}`;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 13, paddingTop: 10, color: '#8f8a80' }}
              iconType="plainline"
              iconSize={18}
            />
            <Line
              type="monotone" dataKey="vendas" name="Vendas"
              stroke={COR_PRINCIPAL} strokeWidth={2.5} dot={false}
              activeDot={{ r: 4, stroke: '#1c1916', strokeWidth: 2 }}
            />
            <Line
              type="monotone" dataKey="leads" name="Leads"
              stroke={COR_SECUNDARIA} strokeWidth={1.5} dot={false}
              activeDot={{ r: 4, stroke: '#1c1916', strokeWidth: 2 }}
            />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grafico grafico-composicao">
          <h3>Composição das vendas</h3>
          <p className="grafico-sub">Distribuição dos ingressos pagos na Greenn.</p>
          {distribuicaoIngressos.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={235}>
                <PieChart>
                  <Pie
                    data={distribuicaoIngressos}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {distribuicaoIngressos.map((item, index) => (
                      <Cell key={item.name} fill={CORES_INGRESSOS[index % CORES_INGRESSOS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${numero(value)} vendas`, name]}
                    contentStyle={{
                      background: '#221e1a', border: '1px solid #3a352e',
                      borderRadius: 3, color: '#edeae4', fontSize: 13,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8f8a80' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="composicao-resumo">
                {distribuicaoIngressos.map((item, index) => (
                  <div className="composicao-item" key={item.name}>
                    <span className="composicao-ponto" style={{ background: CORES_INGRESSOS[index % CORES_INGRESSOS.length] }} />
                    <span>{item.name}</span>
                    <strong>{numero(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grafico-vazio">Nenhuma venda paga no período.</div>
          )}
        </div>
      </section>
    </>
  );
}

/**
 * Tres zeros em Embaixadores podem significar duas coisas bem diferentes:
 * ninguem convidou ninguem NESTE periodo, ou este evento nunca teve convite
 * nenhum. Um "0" sozinho nao distingue as duas — e foi exatamente isso que
 * levou a IFT a abrir chamado de bug em cima de numero certo: o painel abre no
 * primeiro evento da lista, que e justamente o que nao tem convite.
 */
function notaDosConvites(m: Metrics): string | undefined {
  const { total, noHistorico } = m.embaixador;
  if (total > 0) return undefined;
  if (noHistorico > 0) {
    const convites = `${numero(noHistorico)} convite${noHistorico === 1 ? '' : 's'}`;
    return `Nenhum convite no período selecionado. Este evento tem ${convites} em outras datas — amplie o período para vê-los.`;
  }
  return 'Este evento ainda não aparece na lista de participantes presenciais.';
}

/**
 * Um "0" em Leads pode significar tres coisas muito diferentes, e sozinho ele
 * nao distingue nenhuma: deu zero no periodo, os leads deste evento estao
 * misturados com os de outro, ou nao ha fonte de lead nenhuma para ele. As
 * duas ultimas ja levaram a IFT a abrir chamado de bug em cima de numero certo.
 */
function notaDosLeads(m: Metrics): string | undefined {
  // Quando a selecao e uma edicao, os leads vem da fonte da linha e sao os do
  // periodo, nao os daquela edicao — quem separa uma edicao da outra e a data.
  const fonte = m.fonteCompartilhada;
  if (fonte && fonte.leads > 0) return 'Do período selecionado, não separado por edição';

  const balde = m.leadsCompartilhados;
  if (balde) {
    const quantos = `${numero(balde.quantidade)} lead${balde.quantidade === 1 ? '' : 's'}`;
    return m.leadsSemFonte
      ? `Os leads deste evento estão em "${balde.rotulo}" (${quantos}), sem como separar`
      : `Mais ${quantos} em "${balde.rotulo}", sem como separar`;
  }
  if (m.leadsSemFonte) return 'Este evento não aparece na planilha de leads';
  return undefined;
}

function Metrica({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="metrica">
      <div className="metrica-rotulo">{rotulo}</div>
      <div className="metrica-valor num">{valor}</div>
      {nota && <div className="metrica-nota">{nota}</div>}
    </div>
  );
}

function Item({ n, t, extra, sub }: { n: number; t: string; extra?: string; sub?: string }) {
  return (
    <div className="linha-item">
      <div className="bloco-valor num">{numero(n)}</div>
      <div className="t">
        {t}
        {sub && <span className="linha-item-sub"> · {sub}</span>}
      </div>
      {extra && <div className="extra num">{extra}</div>}
    </div>
  );
}

/**
 * Contagem regressiva de uma edicao: dias que faltam para o evento e vendas
 * que faltam para a meta. So o numero e a frase, sem grafico — como pedido.
 *
 * Cada metade so aparece quando a edicao tem aquele dado cadastrado: uma edicao
 * com data mas sem meta mostra so os dias, e vice-versa.
 */
function Contagem({ c }: { c: NonNullable<Metrics['contagemRegressiva']> }) {
  const dias = c.diasParaEvento;
  const restantes = c.vendasRestantes;
  const temDias = dias !== null && c.dataDoEvento;
  const temMeta = restantes !== null && c.metaDeVendas !== null;
  if (!temDias && !temMeta) return null;

  return (
    <section className="contagem">
      <div className="contagem-titulo">Contagem regressiva · {c.rotulo}</div>
      <div className="contagem-cartoes">
        {temDias && (
          <div className="contagem-cartao">
            <div className="contagem-frase">
              {(dias as number) > 0
                ? 'Faltam para o evento'
                : (dias as number) === 0
                  ? 'O evento é'
                  : 'O evento foi há'}
            </div>
            <div className="contagem-numero num">
              {(dias as number) === 0 ? 'hoje' : numero(Math.abs(dias as number))}
              {(dias as number) !== 0 && (
                <span className="contagem-unidade">{Math.abs(dias as number) === 1 ? ' dia' : ' dias'}</span>
              )}
            </div>
            <div className="contagem-nota">Evento em {dataBr(c.dataDoEvento as string)}</div>
          </div>
        )}
        {temMeta && (
          <div className="contagem-cartao">
            <div className="contagem-frase">
              {(restantes as number) > 0 ? 'Faltam para bater a meta' : 'Meta batida'}
            </div>
            <div className="contagem-numero num">
              {(restantes as number) > 0 ? numero(restantes as number) : '✓'}
              {(restantes as number) > 0 && (
                <span className="contagem-unidade">{(restantes as number) === 1 ? ' venda' : ' vendas'}</span>
              )}
            </div>
            <div className="contagem-nota">
              {numero(c.vendasRealizadas)} de {numero(c.metaDeVendas as number)} unidades
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
