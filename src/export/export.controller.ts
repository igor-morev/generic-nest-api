import { Body, Controller, Header, Post, Res } from '@nestjs/common';
import { DesignTokens, ExportService, LayerDto } from './export.service';

export interface ExportProjectDto {
  projectName: string;
  theme: DesignTokens;
  layers: LayerDto[];
}

@Controller('project')
export class ExportController {
  constructor(private readonly htmlService: ExportService) {}

  /**
   * Сценарий 1: Экспорт (Скачивание файла)
   * Фронтенд шлет текущее состояние, бэкенд отдает как файл для скачивания
   */
  @Post('export')
  exportProject(@Body() dto: ExportProjectDto, @Res() res) {
    const htmlContent = this.htmlService.generateFullHtml(
      dto.layers,
      dto.theme,
      dto.projectName,
    );

    const filename = `${dto.projectName || 'landing'}.html`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );

    return res.send(htmlContent);
  }

  /**
   * Сценарий 2: Превью (Открыть в браузере / iframe)
   * Для MVP мы можем передавать данные POST-запросом, чтобы отобразить превью без сохранения в БД,
   * либо в будущем переписать на GET, забирая данные из базы по id.
   */
  @Post('preview')
  @Header('Content-Type', 'text/html')
  previewProject(@Body() dto: ExportProjectDto) {
    // Просто возвращаем строку, браузер сам отрендерит её благодаря Header Content-Type text/html
    return this.htmlService.generateFullHtml(
      dto.layers,
      dto.theme,
      dto.projectName,
    );
  }
}
