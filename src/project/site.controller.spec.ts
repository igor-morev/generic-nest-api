import { Test, TestingModule } from '@nestjs/testing';
import { SiteController } from './site.controller';
import { ProjectService } from './project.service';

describe('SiteController', () => {
  let controller: SiteController;
  let service: { getPublishedSite: jest.Mock };

  beforeEach(async () => {
    service = { getPublishedSite: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteController],
      providers: [{ provide: ProjectService, useValue: service }],
    }).compile();

    controller = module.get<SiteController>(SiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getHomePage() delegates to ProjectService.getPublishedSite with no pageId', () => {
    controller.getHomePage('p1');
    expect(service.getPublishedSite).toHaveBeenCalledWith('p1');
  });

  it('getPage() delegates to ProjectService.getPublishedSite with the given pageId', () => {
    controller.getPage('p1', 'pg1');
    expect(service.getPublishedSite).toHaveBeenCalledWith('p1', 'pg1');
  });
});
