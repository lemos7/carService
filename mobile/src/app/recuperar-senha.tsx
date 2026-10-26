import type { ReactElement } from "react";
import { Redirect } from "expo-router";

export default function Entry(): ReactElement {
  return <Redirect href="/esqueci-a-senha" />;
}
