import { BadRequestException, Injectable } from '@nestjs/common';

// Описываем интерфейсы структуры слоев, прилетающих с фронтенда
export interface WidgetPropertyModel {
  defaultClass?: string;
  class?: string;
  content?: string;
  label?: string;
  name?: string;
  placeholder?: string;
  href?: string;
  target?: string;
  type?: string;
  options?: string[];
  inputType?: string;
  required?: boolean;
  background?: Partial<{
    color: {
      name: string;
      range: string;
    };
    image: string;
    position: string;
    repeat: string;
    size: string;
  }>;
  color?: {
    name: string;
    range: string;
  };
}

export interface WidgetReference {
  widgetType: string;
  defaultWidgetPropertyModel: WidgetPropertyModel;
}

export interface LayerDto {
  id: string;
  isVisible: boolean;
  widgetReference: WidgetReference;
  layerPropertyModel: WidgetPropertyModel;
  children: LayerDto[];
}

export interface FontPair {
  heading: string;
  body: string;
}

export interface DesignTokens {
  name: string;
  primaryColor: string;
  surfaceColor: string;
  contrastColor: string;
  borderRadius: string; // '0px', '8px', '24px'
  fontFamily: FontPair;
  typeScale: number; // 1.15, 1.25, 1.4
  baseFontSize: number; // 16
}

@Injectable()
export class ExportService {
  /**
   * Главный метод сборки полноценного HTML документа
   */
  generateFullHtml(
    layers: LayerDto[],
    theme: DesignTokens,
    projectName: string = 'AI Landing',
  ): string {
    console.log('ui layers', layers);
    console.log('ui theme', theme);

    if (!layers || !Array.isArray(layers)) {
      throw new BadRequestException(
        'Невалидная структура слоев для генерации HTML',
      );
    }

    const themeStyles = this.generateThemeVariables(theme);
    const htmlBody = layers.map((layer) => this.renderLayer(layer)).join('\n');

    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    <!-- Подключаем официальный CDN Tailwind CSS v4 -->
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style type="text/tailwindcss">
      @theme {
        /* Цвета теперь привязаны к переменным из твоего ThemeManager */
        --color-primary: var(--project-primary-color);
        --color-surface: var(--project-surface-color);
        --color-contrast: var(--project-contrast-color);

        /* Типографика и радиусы */
        --font-heading: var(--project-font-heading);
        --font-body: var(--project-font-body);
        --radius-theme: var(--project-radius);

        /* Семантические размеры шрифтов */
        --text-project-h1: var(--project-h1-size);
        --text-project-h2: var(--project-h2-size);
        --text-project-h3: var(--project-h3-size);
        --text-project-body: var(--project-body-size);

        /* Дополнительные настройки для v4 */
        --tracking-tight: -0.02em;
      }
    </style>
    <style>
        :root {
            ${themeStyles}
        }   
    </style>
</head>
<body class="min-h-screen flex flex-col antialiased">
    ${htmlBody}
</body>
</html>
    `.trim();
  }

  private varPrefix() {
    return '--project';
  }

  /**
   * Расчет и генерация CSS-переменных на основе дизайн-токенов
   */
  private generateThemeVariables(theme: DesignTokens): string {
    const s = theme.typeScale || 1.2;
    const base = theme.baseFontSize || 16;

    return `
        --project-primary-color: ${theme.primaryColor};
        --project-surface-color: ${theme.surfaceColor};
        --project-contrast-color: ${theme.contrastColor};

        --project-radius: ${theme.borderRadius};

        --project-font-heading: "${theme.fontFamily?.heading || 'Inter'}";
        --project-font-body: "${theme.fontFamily?.body || 'Inter'}";

        --project-h1-size: ${base * Math.pow(s, 4)}px;
        --project-h2-size: ${base * Math.pow(s, 3)}px;
        --project-h3-size: ${base * Math.pow(s, 2)}px;

        --project-body-size: ${base}px;
    `.trim();
  }

  /**
   * Рекурсивный обход дерева слоев для генерации чистых HTML тегов
   */
  private renderLayer(layer: LayerDto): string {
    if (!layer.isVisible) return '';

    // Вытаскиваем классы по умолчанию и пользовательские переопределения
    const defaultClasses = `${layer?.layerPropertyModel?.defaultClass || ''}`;
    const customClasses = layer.layerPropertyModel?.class || '';
    const combinedClasses =
      `${defaultClasses} ${customClasses}${this.buildClasses(layer)}`.trim();

    // Определяем семантический тег
    let tag = 'div';
    let attributes = `class="${combinedClasses}"`;

    const widgetType = layer.widgetReference?.widgetType;

    switch (widgetType) {
      case 'header':
        tag = 'header';
        break;
      case 'footer':
        tag = 'footer';
        break;
      case 'section':
        tag = 'section';
        break;
      case 'heading':
        tag = 'h2';
        break; // Для SEO и семантики базовый заголовок секции h2
      case 'text':
        tag = 'p';
        break;
      case 'list':
        tag = 'ul';
        break;
      case 'list-item':
        tag = 'li';
        break;

      case 'image': {
        const src = layer.layerPropertyModel?.content || '';
        return `<img src="${src}" class="${combinedClasses}" alt="image" loading="lazy" />`;
      }

      case 'link': {
        const href = layer.layerPropertyModel?.href || '#';
        const target = layer.layerPropertyModel?.target || '_self';
        const content = layer.layerPropertyModel?.content || '';
        return `<a href="${href}" target="${target}" class="${combinedClasses}">${content}</a>`;
      }

      case 'button': {
        const content = layer.layerPropertyModel?.content || '';
        return `<button type="${layer.layerPropertyModel.type}" class="${combinedClasses}">
          ${layer.children?.map((child) => this.renderLayer(child)).join('\n')}
          ${content}
        </button>`;
      }

      case 'icon': {
        const iconName = layer.layerPropertyModel?.content || 'menu'; // дефолтное название иконки
        return `<span class="material-symbols-outlined ${combinedClasses}">${iconName}</span>`;
      }

      // Поддержка элементов форм, которые мы создали ранее
      case 'form': {
        tag = 'form';
        attributes += ` onsubmit="event.preventDefault(); alert('Форма отправлена (MVP Demo)!');"`;
        break;
      }
      case 'text-input': {
        const placeholder = layer.layerPropertyModel?.placeholder || '';
        const required = layer.layerPropertyModel?.required ? 'required' : '';
        const id = 'input-' + layer.id;

        return `
        <label for="${id}">${layer.layerPropertyModel.label}</label>
        <input id="${id}" name="${layer.layerPropertyModel.name}" type="${layer.layerPropertyModel.inputType}" placeholder="${placeholder}" class="${combinedClasses}" ${required} />`;
      }

      case 'select-input': {
        const placeholder = layer.layerPropertyModel?.placeholder || '';
        const required = layer.layerPropertyModel?.required ? 'required' : '';
        const id = 'input-' + layer.id;

        const options = layer.layerPropertyModel.options
          ?.map((option) => {
            return `<option value=${option}>${option}</option>`;
          })
          .join('/n');

        return `
        <label for="${id}">${layer.layerPropertyModel.label}</label>
        <select id="${id}" name="${layer.layerPropertyModel.name}" placeholder="${placeholder}" class="${combinedClasses}" ${required} >
          ${options}
        </select>`;
      }

      case 'textarea': {
        const placeholder = layer.layerPropertyModel?.placeholder || '';
        const id = 'input-' + layer.id;

        return `
        <label for="${id}">${layer.layerPropertyModel.label}</label>
        <textarea id="${id}" name="${layer.layerPropertyModel.name}" placeholder="${placeholder}" class="${combinedClasses}"></textarea>
        `;
      }
    }

    // Собираем контент внутри тега
    let childrenHtml = '';
    if (layer.children && layer.children.length > 0) {
      // Рекурсивный вызов для детей
      childrenHtml = layer.children
        .map((child) => this.renderLayer(child))
        .join('\n');
    } else if (layer.layerPropertyModel?.content) {
      // Если детей нет, но есть текстовое наполнение (для атомов)
      childrenHtml = layer.layerPropertyModel.content;
    }

    return `<${tag} ${attributes}>${childrenHtml}</${tag}>`;
  }

  buildClasses(layer: LayerDto): string {
    let classes = '';
    const val = layer.layerPropertyModel;
    if (val.background) {
      if (val.background.color) {
        classes += ` bg-${val.background.color.name}${val.background.color.range ? `-${val.background.color.range}` : ''}`;
      }

      if (val.background.image) {
        const backgroundImage = val.background.image
          ? `[url('${val.background.image}')]`
          : null;
        classes += ` bg-${backgroundImage}`;
      }

      if (val.background.position) {
        classes += ` bg-${val.background.position}`;
      }

      if (val.background.repeat) {
        classes += ` bg-${val.background.repeat}`;
      }

      if (val.background.size) {
        classes += ` bg-${val.background.size}`;
      }
    }

    if (val.color) {
      classes += ` text-${val.color.name}${val.color.range ? `-${val.color.range}` : ''}`;
    }

    return classes;
  }
}
