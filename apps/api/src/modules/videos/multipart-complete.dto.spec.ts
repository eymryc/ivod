import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MultipartCompleteDto } from './videos.controller';

/**
 * Régression 2026-07-03 : MultipartCompleteDto.parts n'avait aucun
 * décorateur class-validator. Le ValidationPipe global (main.ts) tourne en
 * whitelist:true + forbidNonWhitelisted:true — toute propriété non décorée
 * est traitée comme intruse et fait rejeter la requête ENTIÈRE avec
 * 400 VALIDATION_ERROR, avant même d'atteindre le contrôleur. Résultat en
 * production : tout upload vidéo échouait systématiquement à l'étape finale
 * "multipart/complete", quel que soit le fichier — jamais détecté avant
 * qu'un vrai upload n'aille au bout pour la première fois.
 *
 * Ce test reproduit exactement le pipeline de validation de main.ts
 * (transform + whitelist + forbidNonWhitelisted) sans bootstrap Nest complet.
 */
async function validateAsApiWould(payload: unknown) {
  const instance = plainToInstance(MultipartCompleteDto, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('MultipartCompleteDto — validation (whitelist + forbidNonWhitelisted)', () => {
  it('un payload bien formé passe la validation (le bug faisait échouer exactement ce cas)', async () => {
    const errors = await validateAsApiWould({
      uploadId: 'upload-123',
      parts: [
        { partNumber: 1, etag: 'abc' },
        { partNumber: 2, etag: 'def' },
      ],
    });
    expect(errors).toHaveLength(0);
  });

  it('un seul élément dans parts est aussi accepté', async () => {
    const errors = await validateAsApiWould({
      uploadId: 'upload-123',
      parts: [{ partNumber: 1, etag: 'only-one' }],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejette si uploadId est manquant', async () => {
    const errors = await validateAsApiWould({
      parts: [{ partNumber: 1, etag: 'abc' }],
    });
    expect(errors.some((e) => e.property === 'uploadId')).toBe(true);
  });

  it('rejette si parts est manquant', async () => {
    const errors = await validateAsApiWould({ uploadId: 'upload-123' });
    expect(errors.some((e) => e.property === 'parts')).toBe(true);
  });

  it("rejette si parts n'est pas un tableau", async () => {
    const errors = await validateAsApiWould({
      uploadId: 'upload-123',
      parts: 'not-an-array',
    });
    expect(errors.some((e) => e.property === 'parts')).toBe(true);
  });

  it('rejette si un élément de parts a un partNumber du mauvais type', async () => {
    const errors = await validateAsApiWould({
      uploadId: 'upload-123',
      parts: [{ partNumber: 'one', etag: 'abc' }],
    });
    expect(errors.some((e) => e.property === 'parts')).toBe(true);
  });

  it('rejette si un élément de parts a un etag manquant', async () => {
    const errors = await validateAsApiWould({
      uploadId: 'upload-123',
      parts: [{ partNumber: 1 }],
    });
    expect(errors.some((e) => e.property === 'parts')).toBe(true);
  });

  it('un tableau parts vide est syntaxiquement valide pour le DTO (la règle métier "au moins une partie" vit dans le service, pas le DTO)', async () => {
    const errors = await validateAsApiWould({ uploadId: 'upload-123', parts: [] });
    expect(errors).toHaveLength(0);
  });

  it("rejette une propriété non déclarée au niveau racine (forbidNonWhitelisted) — vérifie qu'on ne désactive pas la protection globale en corrigeant ce bug", async () => {
    const errors = await validateAsApiWould({
      uploadId: 'upload-123',
      parts: [{ partNumber: 1, etag: 'abc' }],
      unexpectedField: 'should not be allowed',
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
