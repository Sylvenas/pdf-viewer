import { useEffect } from "react";
import useFirstRender from "./useFirstRender";

const useFirstEffect: typeof useEffect = (effect, deps) => {
  const isFirst = useFirstRender();

  useEffect(() => {
    if (isFirst) {
      return effect();
    }
  }, deps);
};

export default useFirstEffect;
