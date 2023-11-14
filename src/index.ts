import cron from 'node-cron';
import ConsoleLogger from './console-logger';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import moment from 'moment';
import WebSocket from 'ws';

require('dotenv').config(); // Carrega o .env no process.env

const pathArquivoLog: string = process.env.PATH_ARQUIVO_LOGS ?? `${__dirname}/../logs`;
const urlApiClimaTempo = process.env.URL_API_CLIMATEMPO ?? 'http://apiadvisor.climatempo.com.br';
const pathArquivoDeRelatorio: string = process.env.PATH_ARQUIVO_RELATORIO ?? `${__dirname}/../resultado`;

const LOGGER: ConsoleLogger = ConsoleLogger.getInstance('index');
const apiClimaTempo: AxiosInstance = axios.create({ baseURL: urlApiClimaTempo });

let clientWebSocket: WebSocket;

LOGGER.log('Scheduling...');
cron.schedule(
  process.env.CRON_JOB ?? '* * * * *',
  async () => {
    LOGGER.log('Iniciando Job');

    await iniciaClientWebSocket();

    recuperaMetricasPorPais();

    recuperaMetricasPorRegiao();

    LOGGER.log('Job iniciado e em andamento...');
    persisteLogs();
  },
  { timezone: 'America/Sao_Paulo' }
);

async function iniciaClientWebSocket() {
  clientWebSocket = new WebSocket(`ws://${process.env.HOST_SERVER_WEBSOCKET}/messenger/${process.env.SENDER_ID}`);
  clientWebSocket.on('message', (msg) => LOGGER.log('Mensagem recebida no WebSocket'));

  LOGGER.log('Esperando o cliente conectar com o servidor...');
  await new Promise((resolve) => clientWebSocket.once('open', resolve));
}

function recuperaMetricasPorRegiao() {
  LOGGER.log('Iniciando step para recuperar métricas por região');

  apiClimaTempo
    .get(`/api/v1/forecast/region/${process.env.REGIAO}?token=${process.env.TOKEN_API_CLIMATEMPO}`)
    .then((res) => {
      try {
        const pathArquivoResultado: string = extraiPathArquivoResultado();

        let conteudo: string = '';

        if (fs.existsSync(pathArquivoResultado)) {
          conteudo = fs.readFileSync(pathArquivoResultado, { encoding: 'utf-8' });
        }

        let novoConteudo: string = `* Métricas da região ${res.data.region}\n`;

        res.data.data.forEach((item: Record<string, string>) => {
          novoConteudo += `    - Data: ${item.date_br}\n    - ${item.text ?? item.image}\n\n`;
        });

        novoConteudo +=
          '============================================================================================================================================\n\n\n';

        conteudo = novoConteudo + conteudo;

        fs.writeFileSync(pathArquivoResultado, conteudo);

        enviaMensagemProMessengerPorWebSocket(novoConteudo);

        LOGGER.log('Finalizando step para recuperar métricas por região');
      } catch (e) {
        LOGGER.error(e, 'Ocorreu um erro ao recuperar métricas por região');
        persisteLogs();
      }
    })
    .catch((e) => LOGGER.error(e, 'Ocorreu um erro ao recuperar métricas por região'))
    .finally(() => persisteLogs());
}

function recuperaMetricasPorPais() {
  LOGGER.log('Iniciando step para recuperar métricas por país');

  apiClimaTempo
    .get(`/api/v1/anl/synoptic/locale/${process.env.PAIS}?token=${process.env.TOKEN_API_CLIMATEMPO}`)
    .then((res) => {
      try {
        const pathArquivoResultado: string = extraiPathArquivoResultado();

        let conteudo: string = '';

        if (fs.existsSync(pathArquivoResultado)) {
          conteudo = fs.readFileSync(pathArquivoResultado, { encoding: 'utf-8' });
        }

        const resposta = res.data[0];
        let novoConteudo: string = `* Métricas do país, abreviação: ${resposta.country}\n`;

        novoConteudo += `    - Data: ${resposta.date}\n    - ${resposta.text}\n\n`;

        novoConteudo +=
          '============================================================================================================================================\n\n\n';

        conteudo = novoConteudo + conteudo;

        fs.writeFileSync(pathArquivoResultado, conteudo);

        enviaMensagemProMessengerPorWebSocket(novoConteudo);

        LOGGER.log('Finalizando step para recuperar métricas por país');
      } catch (e) {
        LOGGER.error(e, 'Ocorreu um erro ao recuperar métricas por país');
        persisteLogs();
      }
    })
    .catch((e) => LOGGER.error(e, 'Ocorreu um erro ao recuperar métricas por país'))
    .finally(() => persisteLogs());
}

function extraiPathArquivoResultado() {
  const dataAtual: string = moment().format('YYYY-MM-DD');
  return `${pathArquivoDeRelatorio}/relatorio-${dataAtual}.txt`;
}

function enviaMensagemProMessengerPorWebSocket(mensagem: string) {
  LOGGER.log('Enviando mensagem pro WebSocket');
  clientWebSocket.send(mensagem);
}

function persisteLogs() {
  if (!fs.existsSync(pathArquivoLog)) {
    fs.mkdirSync(pathArquivoLog);
  }

  const dataAtual: string = moment().format('YYYY-MM-DD');

  fs.writeFileSync(`${pathArquivoLog}/log_${dataAtual}.txt`, ConsoleLogger.CACHE.join('\n'), 'utf-8');
}
