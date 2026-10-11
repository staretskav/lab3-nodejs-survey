import { Command } from 'commander';

const program = new Command();

program
  .name('lab3')
  .description('CLI-програма для роботи з даними опитування')
  .version('1.0.0');

program
  .command('hello <name> [surname]')
  .description('Привітати користувача')
  .option('-g, --greeting <text>', 'Текст привітання', 'Привіт')
  .option('-u, --uppercase', 'Вивести привітання великими літерами')
  .action((name, surname, options) => {
    const fullName = surname ? `${name} ${surname}` : name;
    let message = `${options.greeting}, ${fullName}!`;

    if (options.uppercase) {
      message = message.toUpperCase();
    }

    console.log(message);
  });

program.parse(process.argv);