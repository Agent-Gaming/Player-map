import React from "react";
import { useCountdown } from "../../hooks/useCountdown";
import styles from "./CampaignVoting.module.css";

interface CountdownProps {
  targetDate: string;
}

export const Countdown: React.FC<CountdownProps> = ({ targetDate }) => {
  const { label, hasStarted } = useCountdown(targetDate);
  return <span className={styles.countdown}>{hasStarted ? label : `Starts in ${label}`}</span>;
};
