// This function keeps calling "toTry" until promise resolves or has
// retried "max" number of times. First retry has a delay of "delay" seconds.
// "success" is called upon success.
// TODO: Refactor last 3 args to object
export const exponentialBackoff = async (
  max: number,
  delay: number,
  // eslint-disable-next-line @typescript-eslint/ban-types
  toTry: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  success: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  fail: Function
) => {
  try {
    const result = await toTry();
    success(result);
  } catch (error) {
    if (max === 0) {
      return fail();
    }

    setTimeout(() => {
      exponentialBackoff(--max, delay * 2, toTry, success, fail);
    }, delay * 1000);
  }
};
