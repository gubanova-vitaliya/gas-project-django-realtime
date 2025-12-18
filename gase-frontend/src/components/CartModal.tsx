import { FC } from "react";
import { Modal } from "react-bootstrap";
import "./CartModal.css";

interface CartModalProps {
  show: boolean;
  onHide: () => void;
}

export const CartModal: FC<CartModalProps> = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Журнал расчетов</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Функционал журнала расчетов будет реализован позже.</p>
        <p>Здесь будет отображаться список выбранных газов и расчеты.</p>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Закрыть
        </button>
      </Modal.Footer>
    </Modal>
  );
};

