import Calculator from './calculator';

const calculator: Calculator = new Calculator(
  process.argv[2] || 'ws://106.14.136.219:9944'
);

calculator.start();
