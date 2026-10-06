#!/bin/bash

# Read classpath and main class from jib-classpath-file and jib-main-class-file
classpath=$(cat /app/jib-classpath-file)
main_class=$(cat /app/jib-main-class-file)

# Execute Java application
exec java $JVM_FLAGS -cp "$classpath" "$main_class" "$@"
