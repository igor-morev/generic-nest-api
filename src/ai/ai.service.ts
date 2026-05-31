import { GoogleGenAI } from '@google/genai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ai from './types/ai';

@Injectable()
export class AiService {
  ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get('GEMINI_API_KEY'),
    });
  }

  async generate(payload: ai.AIGenerationPayload) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: payload.prompt,
      config: {
        systemInstruction: payload.systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new HttpException('ИИ вернул пустой ответ', HttpStatus.BAD_REQUEST);
    }
    return response.text;
  }
}
