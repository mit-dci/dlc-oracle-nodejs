import { randomBytes, createHash } from 'crypto'
const BN = require('bn.js');
const EC = require('elliptic').ec;

// Create and initialize EC context
// (better do it once and reuse it)
const ec = new EC('secp256k1');
 

class DlcOracle {

    /**
     * When converting a number to Hex, add a leading 0 if it does
     * not have an even number of characters
     * @param hexString The string to pad
     */
    private static padHexString(hexString : string) : string {
        if(hexString.length % 2 !== 0) {
            hexString = "0" + hexString;
        }
        return hexString;
    }


    private static euclideanMod(num1 : any, num2 : any) : any {
        // TODO: Typings
        let num20 = new BN(num2);
        let neg = false;
        if(num1.isNeg()) {
            neg = true;
        } 
        num1 = num1.mod(num2);
        if(neg) {
            if(num2.isNeg()) {
                num1 = num1.sub(num2)
            } else {
                num1 = num1.add(num2)
            }
        }
        return num1;
    }

    /**
     * 
     * @param value 
     */
    static generateNumericMessage(value : number) : Buffer {
        let numberString = value.toString(16)
        numberString = new Array(64 - numberString.length + 1).join('0') + numberString

        return Buffer.from(numberString, 'hex')
    }

    static publicKeyFromPrivateKey(privateKey : Buffer) : Buffer {
        let keyPair = ec.keyFromPrivate(privateKey);
        return Buffer.from(keyPair.getPublic(true,'hex'),'hex');
    } 

    static generateOneTimeSigningKey() : Buffer {
        return randomBytes(32);
    }
    static computeSignaturePubKey(oracleA : Buffer, oracleR : Buffer, message : Buffer) : Buffer {
        let A = ec.keyFromPublic(oracleA);
        let R = ec.keyFromPublic(oracleR);
        
        let Rx = R.pub.getX();
        let RxString = DlcOracle.padHexString(Rx.toString(16));

        let e = createHash('sha256');
        e.update(message);
        e.update(Buffer.from(RxString,'hex'));
        let bigE = new BN(e.digest('hex'),16);
        let P = A.pub.mul(bigE);

        let bigY = P.getY();
        bigY = bigY.neg();
        bigY = DlcOracle.euclideanMod(bigY, ec.curve.p);

        let newY = new BN(bigY.toString(16),16);
        P = ec.curve.point(P.getX(), newY);
        P = P.add(R.pub);

        return Buffer.from(P.encodeCompressed('hex'),'hex');
    }
    static computeSignature(privateKey : Buffer, oneTimeSigningKey : Buffer, message : Buffer) : Buffer {
        let bigPriv = new BN(privateKey.toString('hex'),16);
        let bigK = new BN(oneTimeSigningKey.toString('hex'),16);
        
        let R = ec.g.mul(bigK);
        let Rx = R.getX();
        let RxString = DlcOracle.padHexString(Rx.toString(16));

        let e = createHash('sha256');
        e.update(message);
        e.update(Buffer.from(RxString,'hex'))
        let eHex = e.digest('hex');
        
        let bigE = new BN(eHex,16);
        
        // TODO: Check e out of range

        let bigS = new BN(bigE);

        bigS = bigS.mul(bigPriv);
        bigS = bigK.sub(bigS);
        bigS = DlcOracle.euclideanMod(bigS,ec.curve.n);
        
        // TODO: Check zero

        let numberString = bigS.toString(16)
        if(numberString.length < 64) numberString = new Array(64 - numberString.length + 1).join('0') + numberString

        return Buffer.from(numberString, 'hex')
    }
}

export { DlcOracle };