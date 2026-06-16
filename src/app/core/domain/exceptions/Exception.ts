export default class Exception extends Error {
  constructor(message: string = 'Exception') {
    super(message);
  }
}
