import { CommonEntity } from "src/common/entities/common.entity";
import { Column, Entity, ManyToOne, Tree, TreeChildren, TreeParent, JoinColumn } from "typeorm";
import { AstData } from "./ast-data.entity";

export enum AstNodeType {
    CLASS = 'CLASS',
    METHOD = 'METHOD',
    FILE = 'FILE',
    DIRECTORY = 'DIRECTORY',
}

@Entity()
@Tree("closure-table")
export class AstAbstractData extends CommonEntity {
    @Column()
    name: string; // ClassName, MethodName

    @Column({ type: 'enum', enum: AstNodeType })
    type: AstNodeType; // CLASS, METHOD, FILE

    // 계층 구조 관리
    @TreeParent()
    parent: AstAbstractData;

    @TreeChildren()
    children: AstAbstractData[];

    @Column()
    astDataId: number;

    @ManyToOne(() => AstData, (astData) => astData.abstractDatas, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'astDataId' })
    astData: AstData;
}