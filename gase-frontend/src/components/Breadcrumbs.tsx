import "./Breadcrumbs.css";
import { FC } from "react";

interface ICrumb {
  label: string;
}

interface BreadCrumbsProps {
  crumbs: ICrumb[];
}

export const BreadCrumbs: FC<BreadCrumbsProps> = ({ crumbs }) => (
  <ul className="breadcrumbs">
    {crumbs.map((crumb) => (
      <li key={crumb.label}>{crumb.label}</li>
    ))}
  </ul>
);
