import { ValidationError } from '@/domain/errors';
import { type ProjectStatus, isValidProjectStatus } from '@/domain/types';

/**
 * Props für die Erstellung eines Projects
 */
export interface CreateProjectProps {
  id: string;
  tenantId: string;
  name: string;
  clientName?: string;
  address?: string;
  addressConflict?: boolean;
  addressLat?: number;
  addressLng?: number;
  addressGeocodedAt?: Date;
  status: ProjectStatus;
  asanaGid?: string;
  driveFolderUrl?: string;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props für Client-Info Update
 */
export interface UpdateClientInfoProps {
  clientName?: string;
  address?: string;
}

/**
 * Project Entity (Projekt)
 *
 * Repräsentiert ein Bauprojekt im System.
 * Projekte werden aus Asana synchronisiert und können nicht manuell erstellt werden.
 *
 * @example
 * ```typescript
 * const project = Project.create({
 *   id: 'uuid',
 *   tenantId: 'tenant-uuid',
 *   name: 'Haus Weber',
 *   status: 'active',
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class Project {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly clientName: string | undefined,
    public readonly address: string | undefined,
    public readonly addressConflict: boolean,
    public readonly addressLat: number | undefined,
    public readonly addressLng: number | undefined,
    public readonly addressGeocodedAt: Date | undefined,
    public readonly status: ProjectStatus,
    public readonly asanaGid: string | undefined,
    public readonly driveFolderUrl: string | undefined,
    public readonly syncedAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use Project.create()
  }

  /**
   * Erstellt eine neue Project-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn die Eingabedaten ungültig sind
   */
  static create(props: CreateProjectProps): Project {
    // Validate name
    Project.validateName(props.name);

    // Validate status
    Project.validateStatus(props.status);

    return new Project(
      props.id,
      props.tenantId,
      props.name.trim(),
      props.clientName?.trim(),
      props.address?.trim(),
      props.addressConflict ?? false,
      props.addressLat,
      props.addressLng,
      props.addressGeocodedAt,
      props.status,
      props.asanaGid,
      props.driveFolderUrl?.trim(),
      props.syncedAt,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Ändert den Status des Projekts.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn der Status ungültig ist
   */
  withStatus(status: ProjectStatus): Project {
    Project.validateStatus(status);

    return new Project(
      this.id,
      this.tenantId,
      this.name,
      this.clientName,
      this.address,
      this.addressConflict,
      this.addressLat,
      this.addressLng,
      this.addressGeocodedAt,
      status,
      this.asanaGid,
      this.driveFolderUrl,
      this.syncedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Kundeninformationen.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   */
  withClientInfo(props: UpdateClientInfoProps): Project {
    return new Project(
      this.id,
      this.tenantId,
      this.name,
      props.clientName !== undefined ? props.clientName.trim() : this.clientName,
      props.address !== undefined ? props.address.trim() : this.address,
      this.addressConflict,
      this.addressLat,
      this.addressLng,
      this.addressGeocodedAt,
      this.status,
      this.asanaGid,
      this.driveFolderUrl,
      this.syncedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Setzt den Synchronisationszeitpunkt.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   */
  withSyncedAt(syncedAt: Date): Project {
    return new Project(
      this.id,
      this.tenantId,
      this.name,
      this.clientName,
      this.address,
      this.addressConflict,
      this.addressLat,
      this.addressLng,
      this.addressGeocodedAt,
      this.status,
      this.asanaGid,
      this.driveFolderUrl,
      syncedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Entfernt die Asana-Verknüpfung.
   * Das Projekt bleibt erhalten, wird aber nicht mehr synchronisiert.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   */
  withoutAsanaLink(): Project {
    return new Project(
      this.id,
      this.tenantId,
      this.name,
      this.clientName,
      this.address,
      this.addressConflict,
      this.addressLat,
      this.addressLng,
      this.addressGeocodedAt,
      this.status,
      undefined, // asanaGid entfernt
      this.driveFolderUrl,
      undefined, // syncedAt entfernt
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Drive-Folder URL.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   */
  withDriveFolderUrl(driveFolderUrl: string | undefined): Project {
    return new Project(
      this.id,
      this.tenantId,
      this.name,
      this.clientName,
      this.address,
      this.addressConflict,
      this.addressLat,
      this.addressLng,
      this.addressGeocodedAt,
      this.status,
      this.asanaGid,
      driveFolderUrl?.trim(),
      this.syncedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert das Adress-Konflikt Flag.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   */
  withAddressConflict(addressConflict: boolean): Project {
    return new Project(
      this.id,
      this.tenantId,
      this.name,
      this.clientName,
      this.address,
      addressConflict,
      this.addressLat,
      this.addressLng,
      this.addressGeocodedAt,
      this.status,
      this.asanaGid,
      this.driveFolderUrl,
      this.syncedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Geo-Koordinaten der Projektadresse.
   * Gibt eine neue Project-Instanz zurück (Immutability).
   */
  withGeoLocation(lat: number, lng: number): Project {
    return new Project(
      this.id,
      this.tenantId,
      this.name,
      this.clientName,
      this.address,
      this.addressConflict,
      lat,
      lng,
      new Date(),
      this.status,
      this.asanaGid,
      this.driveFolderUrl,
      this.syncedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Prüft, ob das Projekt geocodierte Koordinaten hat.
   */
  get hasGeoLocation(): boolean {
    return this.addressLat !== undefined && this.addressLng !== undefined;
  }

  /**
   * Prüft, ob das Projekt aktiv ist.
   */
  get isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Prüft, ob das Projekt aus Asana stammt.
   */
  get isFromAsana(): boolean {
    return !!this.asanaGid;
  }

  /**
   * Prüft, ob das Projekt noch bearbeitet werden kann.
   * Abgeschlossene Projekte können nicht mehr bearbeitet werden.
   */
  get canBeModified(): boolean {
    return this.status !== 'completed';
  }

  /**
   * Validiert den Projektnamen.
   */
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Projektname ist erforderlich', { field: 'name' });
    }
  }

  /**
   * Validiert den Projektstatus.
   */
  private static validateStatus(status: string): void {
    if (!isValidProjectStatus(status)) {
      throw new ValidationError('Ungültiger Projektstatus', {
        field: 'status',
        value: status,
      });
    }
  }
}
