export function log () {
  if (
    typeof console !== 'undefined' &&
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'development'
  ) {
    console.log.apply(
      console,
      Array.prototype.slice.call(arguments)
    )
  }
}

export function warn () {
  if (
    typeof console !== 'undefined' &&
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'development'
  ) {
    console.warn.apply(
      console,
      Array.prototype.slice.call(arguments)
    )
  }
}

export function error () {
  if (
    typeof console !== 'undefined' &&
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'development'
  ) {
    console.error.apply(
      console,
      Array.prototype.slice.call(arguments)
    )
  }
}

export var logger = {
  log: log,
  warn: warn,
  error: error
}