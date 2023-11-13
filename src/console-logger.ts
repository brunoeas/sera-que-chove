export default class ConsoleLogger {
  public readonly name: string;

  public static readonly CACHE: string[] = [];

  private static readonly DEFAULT_LOGGER_NAME = 'anonymous';

  private readonly DEFAULT_PARAM_KEY = '{}';

  private constructor(name: string) {
    this.name = name;
  }

  public static getInstance(name: string = ConsoleLogger.DEFAULT_LOGGER_NAME): ConsoleLogger {
    return new ConsoleLogger(name);
  }

  public log = (text: string, ...params: any[]): void => {
    const textBlocks: string[] = this.getTextBlocksWithParams(text ?? '', params ?? []);
    const actualDate: string = this.getActualDate();
    console.log(`> ${actualDate} [${this.name}]`, ...textBlocks);
    ConsoleLogger.CACHE.push([`> ${actualDate} [${this.name}] `, ...textBlocks].join(''));
  };

  public error = (err: any, text: string, ...params: any[]): void => {
    const textBlocks: string[] = this.getTextBlocksWithParams(text ?? '', params ?? []);
    const actualDate: string = this.getActualDate();
    console.error(`> ${actualDate} [${this.name}]`, ...textBlocks, '\n', new Error(err));
    ConsoleLogger.CACHE.push([`> ${actualDate} [${this.name}] `, ...textBlocks, '\n', `${new Error(err)}`].join(''));
  };

  public clear(): void {
    console.clear();
  }

  private getTextBlocksWithParams(text: string, params: any[]): string[] {
    const formattedText: string = typeof text !== 'string' ? JSON.stringify(text, null, 2) : text;
    const textBlocks: string[] = formattedText.split(this.DEFAULT_PARAM_KEY);
    if (textBlocks.length <= 1) {
      return textBlocks;
    }

    const textsWithParams: string[] = [];
    textBlocks.forEach((text, i) => {
      if (params[i]) {
        textsWithParams.push(text, this.extractParamFormatted(params, i));
      } else {
        textsWithParams.push(text);
      }
    });

    return textsWithParams;
  }

  private extractParamFormatted(params: any[], index: number): string {
    const param: any = params[index];
    try {
      return JSON.stringify(param, null, 2);
    } catch (err) {
      return param as string;
    }
  }

  private getActualDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      year: '2-digit',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return new Intl.DateTimeFormat('pt-BR', options).format(new Date());
  }
}
