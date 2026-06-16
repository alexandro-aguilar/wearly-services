import Exception from './Exception';

export default class NotFoundException extends Exception {
  constructor(message: string = 'Not Found') {
    super(message);
  }
}
