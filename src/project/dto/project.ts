import { DesignTokens, LayerDto } from 'src/export/export.service';

export interface ProjectSummaryDto {
  id: string;
  name: string;
  industry?: string;
  status: 'draft' | 'published';
  updatedAt?: Date;
}

export interface ProjectDto extends ProjectSummaryDto {
  theme?: DesignTokens;
  pages: { id: string; pageName: string }[];
}

export interface CreateProjectDto {
  name: string;
  industry?: string;
}

export type UpdateProjectDto = Partial<{
  name: string;
  theme: DesignTokens;
  status: 'draft' | 'published';
}>;

export interface PageDto {
  id: string;
  pageName: string;
  layers: LayerDto[];
}

export interface CreatePageDto {
  pageName: string;
}

export interface SavePageDto {
  layers: LayerDto[];
}
