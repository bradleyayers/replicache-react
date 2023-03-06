import type {Replicache} from 'replicache';
import type {ReadonlyJSONValue, ReadTransaction} from 'replicache';
import {useEffect, useState} from 'react';
import {unstable_batchedUpdates} from 'react-dom';

type Subscribable = Pick<Replicache, 'subscribe'>;

// We wrap all the callbacks in a `unstable_batchedUpdates` call to ensure that
// we do not render things more than once over all of the changed subscriptions.

let hasPendingCallback = false;
let callbacks: (() => void)[] = [];

function doCallback() {
  const cbs = callbacks;
  callbacks = [];
  hasPendingCallback = false;
  unstable_batchedUpdates(() => {
    for (const callback of cbs) {
      callback();
    }
  });
}

export function useSubscribe<R extends ReadonlyJSONValue | undefined>(
  rep: Subscribable | null | undefined,
  query: (tx: ReadTransaction) => Promise<R>,
  def: R,
  deps: Array<unknown> = [],
): R {
  const [snapshot, setSnapshot] = useState<R>(def);
  useEffect(() => {
    if (!rep) {
      return;
    }

    return rep.subscribe(query, {
      onData: (data: R) => {
        callbacks.push(() => setSnapshot(data));
        if (!hasPendingCallback) {
          void Promise.resolve().then(doCallback);
          hasPendingCallback = true;
        }
      },
    });
  }, [rep, ...deps]);
  return snapshot;
}
