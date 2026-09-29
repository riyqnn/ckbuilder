import { Verifier } from 'ckb-testtool';
import {
  AttestationData,
  CLAIM,
  EVIDENCE,
  ISSUED_AT,
  REVOKED_AT,
  STATUS_REVOKED,
  STATUS_VALID,
  addAttestationInput,
  addAttestationOutput,
  addChangeOutput,
  addFundingInput,
  attestationIdFrom,
  encode,
  setup,
} from './fixtures';

const ERR_ENCODING = 1;
const ERR_UNAUTH = 3;
const ERR_BAD_ID = 5;
const ERR_IMMUTABLE = 7;
const ERR_HOLDER_CHANGED = 8;
const ERR_BAD_GROUP = 9;

// A cell that already exists on chain; its id is not derived from this tx.
const EXISTING_ID = `0x${'ab'.repeat(32)}` as const;

const validData = encode({ attestation_id: EXISTING_ID, status: STATUS_VALID });
const revokedData = encode({
  attestation_id: EXISTING_ID,
  status: STATUS_REVOKED,
  revoked_at: REVOKED_AT,
});

describe('AttestationData encoding', () => {
  test('VALID and REVOKED serialize to the same length', () => {
    expect((validData.length - 2) / 2).toBe(184);
    expect(revokedData.length).toBe(validData.length);
  });

  test('matches the pinned cross-implementation vector', () => {
    // Pins the byte layout of schema/pox.mol. If this changes, the hand-written
    // reader in contracts/pox-type/src/schema.ts must change with it.
    expect(validData).toBe(
      '0xb8000000' + // full_size = 184
        '2400000025000000450000004600000047000000' + // offsets 0..4
        '4f000000570000009000000' + '0' + // offsets 5..7
        '01' + // version
        'ab'.repeat(32) + // attestation_id
        '00' + // kind = contribution
        '00' + // status = VALID
        'e059eb6600000000' + // issued_at = 1726700000
        '0000000000000000' + // revoked_at = 0
        '35000000' + // claim length = 53
        '436f726520636f6e7472696275746f7220746f20434b422065636f73797374656d206f70656e20736f7572636520746f6f6c696e67' +
        '24000000' + // evidence length = 36
        '68747470733a2f2f6769746875622e636f6d2f6e6572766f736e6574776f726b2f636b62',
    );
  });

  test('round-trips through the dApp codec', () => {
    const decoded = AttestationData.decode(validData);
    expect(decoded.claim).toBe(CLAIM);
    expect(decoded.evidence).toBe(EVIDENCE);
    expect(decoded.issued_at).toBe(ISSUED_AT);
    expect(decoded.revoked_at).toBe(0n);
  });
});

describe('pox-type: accepted transactions', () => {
  test('issue by the authorized issuer', async () => {
    const scene = setup();
    const outPoint = addFundingInput(scene, scene.issuerLock);
    const id = attestationIdFrom(outPoint.txHash, outPoint.index);
    addAttestationOutput(scene, encode({ attestation_id: id, status: STATUS_VALID }));

    await Verifier.from(scene.resource, scene.tx).verifySuccess(true);
  });

  test('revoke by the authorized issuer', async () => {
    const scene = setup();
    addAttestationInput(scene, validData);
    addFundingInput(scene, scene.issuerLock);
    addAttestationOutput(scene, revokedData);

    await Verifier.from(scene.resource, scene.tx).verifySuccess(true);
  });

  test('burn a revoked attestation, reclaiming its capacity', async () => {
    const scene = setup();
    addAttestationInput(scene, revokedData);
    addFundingInput(scene, scene.issuerLock);
    addChangeOutput(scene, scene.issuerLock);

    await Verifier.from(scene.resource, scene.tx).verifySuccess(true);
  });
});

describe('pox-type: rejected transactions', () => {
  test('revoke without the issuer is unauthorized', async () => {
    const scene = setup();
    addAttestationInput(scene, validData);
    addFundingInput(scene, scene.outsiderLock);
    addAttestationOutput(scene, revokedData);

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_UNAUTH);
  });

  test('burn without the issuer is unauthorized', async () => {
    const scene = setup();
    addAttestationInput(scene, validData);
    addFundingInput(scene, scene.outsiderLock);
    addChangeOutput(scene, scene.outsiderLock);

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_UNAUTH);
  });

  test('issue with an attestation_id not derived from input 0', async () => {
    const scene = setup();
    addFundingInput(scene, scene.issuerLock);
    addAttestationOutput(scene, encode({ attestation_id: EXISTING_ID, status: STATUS_VALID }));

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_BAD_ID);
  });

  test('revoke that rewrites the claim', async () => {
    const scene = setup();
    addAttestationInput(scene, validData);
    addFundingInput(scene, scene.issuerLock);
    // Same length, so the encoding stays canonical and only the claim differs.
    const tampered = CLAIM.slice(0, -4) + 'XXXX';
    expect(tampered.length).toBe(CLAIM.length);
    addAttestationOutput(
      scene,
      encode({
        attestation_id: EXISTING_ID,
        status: STATUS_REVOKED,
        revoked_at: REVOKED_AT,
        claim: tampered,
      }),
    );

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_IMMUTABLE);
  });

  test('revoke that moves the cell to another holder', async () => {
    const scene = setup();
    addAttestationInput(scene, validData);
    addFundingInput(scene, scene.issuerLock);
    addAttestationOutput(scene, revokedData, scene.outsiderLock);

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_HOLDER_CHANGED);
  });

  test('revoke that skims capacity off the holder', async () => {
    const scene = setup();
    addAttestationInput(scene, validData);
    addFundingInput(scene, scene.issuerLock);
    // Both values sit above the cell's 326 CKB occupied capacity, so the skim
    // survives ccc's JSON transformer and reaches the script.
    addAttestationOutput(scene, revokedData, scene.holderLock, 40_000_000_000n);

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_HOLDER_CHANGED);
  });

  test('issue with cell data that is not canonical AttestationData', async () => {
    const scene = setup();
    addFundingInput(scene, scene.issuerLock);
    addAttestationOutput(scene, '0xdeadbeef');

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_ENCODING);
  });

  test('two attestations in one group is not a supported shape', async () => {
    const scene = setup();
    const outPoint = addFundingInput(scene, scene.issuerLock);
    const id = attestationIdFrom(outPoint.txHash, outPoint.index);
    addAttestationOutput(scene, encode({ attestation_id: id, status: STATUS_VALID }));
    addAttestationOutput(scene, encode({ attestation_id: id, status: STATUS_VALID }));

    await Verifier.from(scene.resource, scene.tx).verifyFailure(ERR_BAD_GROUP);
  });
});
