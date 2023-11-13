import cron from 'node-cron';
import ConsoleLogger from './console-logger';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import moment from 'moment';
import WebSocket, { WebSocketServer } from 'ws';

require('dotenv').config(); // Carrega o .env no process.env

const pathArquivoLog: string = process.env.PATH_ARQUIVO_LOGS ?? `${__dirname}/../logs`;
const urlApiClimaTempo = process.env.URL_API_CLIMATEMPO ?? 'http://apiadvisor.climatempo.com.br';
const token: string = process.env.TOKEN_API_CLIMATEMPO ?? '';
const pathArquivoDeRelatorio: string = process.env.PATH_ARQUIVO_RELATORIO ?? `${__dirname}/../resultado/relatorio.txt`;
const regiao: string = 'sul';

const LOGGER: ConsoleLogger = ConsoleLogger.getInstance('index');
const apiClimaTempo: AxiosInstance = axios.create({ baseURL: urlApiClimaTempo });

// executa todos os dias as 06:00, 14:00 e 22:00
cron.schedule(
  // '0 0 6,14,22 * * *',
  '* * * * *',
  () => {
    LOGGER.log('Iniciando Job');

    recuperaMetricasPorRegiao();

    LOGGER.log('Job em andamento...');
    persisteLogs();
  },
  { timezone: 'America/Sao_Paulo' }
);

function recuperaMetricasPorRegiao() {
  apiClimaTempo
    .get(`/api/v1/forecast/region/${regiao}?token=${token}`)
    .then(async (res) => {
      try {
        let conteudo: string = '';

        if (fs.existsSync(pathArquivoDeRelatorio)) {
          conteudo = fs.readFileSync(pathArquivoDeRelatorio, { encoding: 'utf-8' });
        }

        let novoConteudo: string = `* Métricas da região ${res.data.region}\n`;

        res.data.data.forEach((item: Record<string, string>) => {
          novoConteudo += `    - Data: ${item.date_br}\n    - ${item.text ?? item.image}\n\n`;
        });

        novoConteudo +=
          '============================================================================================================================================\n\n\n';

        conteudo = novoConteudo + conteudo;

        fs.writeFileSync(pathArquivoDeRelatorio, conteudo);

        await enviaMensagemProMessengerPorWebSocket(novoConteudo)

        LOGGER.log('Finalizando step para recuperar métricas por região');
      } catch (e) {
        LOGGER.error(e, 'Ocorreu um erro ao recuperar métricas por região');
        persisteLogs();
      }
    })
    .catch((e) => LOGGER.error(e, 'Ocorreu um erro ao recuperar métricas por região'))
    .finally(() => persisteLogs());
}

async function enviaMensagemProMessengerPorWebSocket(mensagem: string) {
  let client = new WebSocket('ws://localhost:8080/messenger/' + process.env.SENDER_ID);
  client.on('message', (msg) => LOGGER.log('Mensagem -> {}', msg));
  LOGGER.log('Esperamos o cliente conectar com o servidor');
  // Esperamos o cliente conectar com o servidor usando async/await
  await new Promise((resolve) => client.once('open', resolve));

  LOGGER.log('Enviando mensagem no chat');
  // Imprimi "Hello!", um para cada cliente
  client.send(mensagem);
}

function persisteLogs() {
  if (!fs.existsSync(pathArquivoLog)) {
    fs.mkdirSync(pathArquivoLog);
  }

  const dataAtual: string = moment().format('YYYY-MM-DD');

  fs.writeFileSync(`${pathArquivoLog}/log_${dataAtual}.txt`, ConsoleLogger.CACHE.join('\n'), 'utf-8');
}
