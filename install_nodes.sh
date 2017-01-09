#!/bin/sh

for i in $(ls -d */ | grep "^node-red-contrib-")
do
    echo ${i%%/}
    cd $i && npm install
    cd - > /dev/null
done
