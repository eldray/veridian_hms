import { describe, expect, it, vi } from 'vitest';
import { DocumentController } from '../src/modules/document/DocumentController';

describe('generated document list authorization', () => {
  it('returns only document templates the caller role may open', async () => {
    const documents = [
      { id: 'doc-lab', entityType: 'encounter', generatedById: 'doctor-1', template: { templateType: 'lab_result' } },
      { id: 'doc-rx', entityType: 'encounter', generatedById: 'doctor-1', template: { templateType: 'prescription' } },
      { id: 'doc-discharge', entityType: 'encounter', generatedById: 'doctor-1', template: { templateType: 'discharge_summary' } },
      { id: 'doc-bill', entityType: 'bill', generatedById: 'accounts-1', template: { templateType: 'bill_statement' } },
    ];
    const getDocumentsByEntity = vi.fn().mockResolvedValue(documents);
    const controller = new DocumentController();
    (controller as any).documentService = { getDocumentsByEntity };
    const response = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const request: any = {
      params: { entityType: 'encounter', entityId: 'encounter-1' },
      user: { id: 'lab-1', userId: 'lab-1', role: 'lab_tech' },
    };

    await controller.getDocumentsByEntity(request, response as any);

    expect(getDocumentsByEntity).toHaveBeenCalledWith('encounter', 'encounter-1');
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: [documents[0]],
    });
  });

  it('does not expose generated document metadata to a role that cannot open its template', async () => {
    const documents = [
      { id: 'doc-rx', entityType: 'encounter', generatedById: 'sonographer-1', template: { templateType: 'prescription' } },
    ];
    const controller = new DocumentController();
    (controller as any).documentService = { getDocumentsByEntity: vi.fn().mockResolvedValue(documents) };
    const response = { json: vi.fn().mockReturnThis(), status: vi.fn().mockReturnThis() };
    const request: any = {
      params: { entityType: 'encounter', entityId: 'encounter-1' },
      user: { id: 'sonographer-1', userId: 'sonographer-1', role: 'sonographer' },
    };

    await controller.getDocumentsByEntity(request, response as any);

    expect(response.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});
