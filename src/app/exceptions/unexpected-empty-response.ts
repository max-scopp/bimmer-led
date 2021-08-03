export class UnexpectedEmptyResponse extends Error {
  message = 'Controller responded with no data where data was expected.';
}
