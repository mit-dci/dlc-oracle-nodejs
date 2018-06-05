# Building a Discreet Log Contract Oracle in NodeJS

In 2017, [Tadge Dryja](https://twitter.com/tdryja) published a [paper](https://adiabat.github.io/dlc.pdf) on Discreet Log Contracts. 

By creating a Discreet Log Contract, Alice can form a contract paying Bob some time in the future, based on preset conditions, without committing any details of those conditions to the blockchain. Therefore it is discreet in the sense that no external observer can learn its existence from the public ledger. This contract depends on an external entity or entities publishing a signed message at some point in the future (before the expiration of the contract). The contents of this signed message determine the division of the funds committed to the contract. This external entity is called an “oracle”. Using Discreet Log Contracts, the signature published by the oracle gives each participant of the contract the possibility to claim the amount from the contract that is due him without the need for cooperation from the other party. 

This tutorial will describe you how to build a Discreet Log Contract "oracle". This tutorial describes how to do this in NodeJS, but you can also use [Go](https://github.com/mit-dci/dlc-oracle-go/blob/master/TUTORIAL.md) or [.NET Core](https://github.com/mit-dci/dlc-oracle-dotnet/blob/master/TUTORIAL.md)

### Set up a new project

Firstly, set up a new empty project and include the correct libraries. We start by creating the project folder and add the main program file to it.

```bash
cd ~
mkdir tutorial
cd tutorial
npm init
npm install --save dlc-oracle-nodejs
touch index.js
```

Next, open the file `index.js` in your favorite editor, and add this to it:

```javascript
function main() {

}

main();
```

### Generate and save the oracle's private key

Next, we'll need to have a private key. This private key is used in conjunction with a unique one-time-signing key for each message. The private key of the oracle never changes, and its public key is incorporated into Discreet Log Contracts that people form. So if we lose access to this key, people's contracts might be unable to settle. In this example, we'll store the key in a simple format on disk. This is not secure, and should not be considered for production scenarios. However, to illustrate the working of the library it is sufficient.

So we add this function to the `index.js` file:

```javascript
function getOrCreateKey() {
	let key;
    let keyFile = path.join(__dirname,"privkey.hex");
    if(fs.existsSync(keyFile)) {
        key = fs.readFileSync(keyFile);
    } else {
        key = randomBytes(32);
        fs.writeFileSync(keyFile, privateKey);
    }
	return key;
}
```

and then we adjust the `main()` function to use it, add a global variable to keep the key in, and add the necessary imports:

```javascript
const randomBytes = require('crypto').randomBytes;
const fs = require('fs');
const path = require('path');

let privateKey;
(...)

function main() {
    privateKey = getOrCreateKey();
}

main();
```

### Derive and print out the public key

Next, we'll use the DLC library to generate the public key from the private key and print it out to the console:

```javascript
(...)
const DlcOracle = require('dlc-oracle-nodejs').DlcOracle;

(...)

function main() {
    (...)

    let publicKey = DlcOracle.publicKeyFromPrivateKey(privateKey);
    console.log("Oracle Public Key: ",publicKey.toString('hex'));

}

(...)
```

In your terminal window, run the application:

```bash
node index.js
```

The program should show an output similar to this:

```
Oracle Public Key:  03c0d496ef6656fe102a689abc162ceeae166832d826f8750c94d797c92eedd465
```

### Create a loop that publishes oracle values

Next, we'll add a loop to the oracle that will take the following steps:

* Generate a new one-time signing key
* Print out the public key to that signing key (the "R Point")
* Wait 1 minute
* Sign a random numerical value with the one-time key 
* Print out the value and signature

Using the oracle's public key and the "R Point" (public key to the one-time signing key), people can use LIT to form a Discreet Log Contract, and use your signature when you publish it to settle the contract.

So for a regular DLC use case, you would publish your oracle's public key and the R-point for each time / value you will publish onto a website or some other form of publication, so that people can obtain the keys and use them in their contracts. When the time arrives you have determined the correct value, and sign it, you publish both the value and your signature so the contract participants can use those values to settle the contract.

As for the one-time signing key, this has the same security requirements as the oracle's private key. If this key is lost, contracts that depend on it cannot be settled. It is therefore important to save this key somewhere safe. Just keeping it in memory as we do in this example is not good practice for production scenarios. 

One last note on the one-time signing key: The reason that it's named this, is that you can only use it once. Even though there's no technical limitation of you producing two signatures with that key, doing so using the signature scheme DLC uses will allow people to derive your oracle's private key from the data you published.

OK, back to the code. So, first we add the generation of the one-time signing key and printing out the corresponding public key (R Point).

```javascript
(...)

let oneTimeSigningKey;

(...)

func main() {
	(...)
	generateAndPrintKey();
}

function generateAndPrintKey() {
    oneTimeSigningKey = DlcOracle.generateOneTimeSigningKey();
    let rPoint = DlcOracle.publicKeyFromPrivateKey(oneTimeSigningKey);
    console.log("R-Point for next publication: ",rPoint.toString('hex'));
}

(...)
```

Go ahead and run it again. You'll see an output similar to this:

```
Oracle Public Key:  03c0d496ef6656fe102a689abc162ceeae166832d826f8750c94d797c92eedd465
R-Point for next publication:  02b46b8e2d1976b1d0f9734617a166165b8d19c7a053159dfe838c5edaeb57c2c7
```

Next step is to actually generate a random value and sign it after waiting for a minute. This wait period is to simulate the time between announcing your public keys and publishing the actual value. In this time people will form contracts that use the values.

If you want to wait less than a minute, decrease the 60000 (millisecond) value passed to `setTimeout`.

Using the DLC library, signing values is quite easy:

```javascript
(...)


function generateAndPrintKey() {
    (...)
	setTimeout(() => { signValueAndPrint(); }, 60000);
}

function signValueAndPrint() {
    // Generate a random number between 10000-20000
    let value = Math.floor(Math.random() * 10000) + 10000;

    // Generate message to sign. Uses the same encoding as expected by LIT when settling the contract
    let message = DlcOracle.generateNumericMessage(value);
    
    // Sign the message
    let signature = DlcOracle.computeSignature(privateKey, oneTimeSigningKey, message);

    console.log("Value published: ", value);
    console.log("Signature: ", signature.toString('hex'));

    generateAndPrintKey();
}
```

Next, run your code again. It will print out something like this (you'll have to wait 60 seconds for the value to be published, unless you decreased the `setTimeout` parameter).

```
Oracle public key: 032382208af6ab43b8d21e71edf73ec8f37070a9b4fc4547f406bcd744b4e8e7b3
R-Point for next publication: 02f650ab605757ef687ffa1ab0e493ed8e8c054adf6ff010605656ed3a992e6ef4
Signed message. Value: 18081
Signature: 8b044f80589821a8a6d1837752dfdda5809236b7ce72e63e789ae9288c2937dc
R-Point for next publication: 03126cdf6340bd1277abe2f2bef6ab21c594e44398876113efebb2e6a855ec0ae1
```

### Done!

And that's all there is to it. Next steps you could take involve changing how you secure the private key(s), how you publish your public key and the R-points (to something other than your console), and to sign actual real-world values using this set-up. If you publish interesting data feeds using this mechanism, people can base real Discreet Log Contracts on them. If you created any cool oracles, feel free to send a pull request to our [samples repository](https://github.com/mit-dci/dlc-oracle-nodejs-samples) so we can include them for other people to enjoy. You'll also find the complete code for this tutorial there as [one of the samples](https://github.com/mit-dci/dlc-oracle-nodejs-samples/tree/master/tutorial)